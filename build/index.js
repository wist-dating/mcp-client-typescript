import { Anthropic } from "@anthropic-ai/sdk";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import * as readline from "readline/promises";
import * as dotenv from "dotenv";
import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
dotenv.config();
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set");
}
class MCPClient {
    mcp;
    anthropic;
    transport = null;
    tools = [];
    isRec = false;
    recordProcess = null;
    tempAudioFile = path.join(process.cwd(), "temp_audio.wav");
    constructor() {
        this.anthropic = new Anthropic({
            apiKey: ANTHROPIC_API_KEY,
        });
        this.mcp = new Client({ name: "mcp-client-cli", version: "1.0.0" });
    }
    async connectToServer(serverScriptPath) {
        try {
            const isJs = serverScriptPath.endsWith(".js");
            const isPy = serverScriptPath.endsWith(".py");
            if (!isJs && !isPy) {
                throw new Error("Server script must be a .js or .py file");
            }
            const command = isPy
                ? process.platform === "win32"
                    ? "python"
                    : "python3"
                : process.execPath;
            this.transport = new StdioClientTransport({
                command,
                args: [serverScriptPath],
            });
            this.mcp.connect(this.transport);
            const toolsResult = await this.mcp.listTools();
            this.tools = toolsResult.tools.map((tool) => {
                return {
                    name: tool.name,
                    description: tool.description,
                    input_schema: tool.inputSchema,
                };
            });
            console.log("Connected to server with tools:", this.tools.map(({ name }) => name));
        }
        catch (e) {
            console.log("Failed to connect to MCP server: ", e);
            throw e;
        }
    }
    async processQuery(query) {
        const messages = [
            {
                role: "user",
                content: query,
            },
        ];
        const response = await this.anthropic.messages.create({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 1000,
            messages,
            tools: this.tools,
        });
        const finalText = [];
        const toolResults = [];
        for (const content of response.content) {
            if (content.type === "text") {
                finalText.push(content.text);
            }
            else if (content.type === "tool_use") {
                const toolName = content.name;
                const toolArgs = content.input;
                const result = await this.mcp.callTool({
                    name: toolName,
                    arguments: toolArgs,
                });
                toolResults.push(result);
                finalText.push(`[Calling tool ${toolName} with args ${JSON.stringify(toolArgs)}]`);
                messages.push({
                    role: "user",
                    content: result.content,
                });
                const response = await this.anthropic.messages.create({
                    model: "claude-3-5-sonnet-20241022",
                    max_tokens: 1000,
                    messages,
                });
                finalText.push(response.content[0].type === "text" ? response.content[0].text : "");
            }
        }
        return finalText.join("\n");
    }
    startRecording() {
        console.log("Current working directory:", process.cwd());
        if (this.isRec) {
            console.log("Already recording...");
            return;
        }
        console.log("Recording... Press Ctrl+C to stop recording.");
        this.isRec = true;
        try {
            this.recordProcess = spawn("sox", [
                "-V",
                "-d", // Use default audio device
                "-b", "16",
                "-r", "16000", // Sample rate
                "-c", "1", // Mono channel
                "-e", "signed-integer",
                "-t", "wav",
                "--no-dither",
                this.tempAudioFile,
                "trim", "0", "5"
            ]);
            this.recordProcess.stderr.on("data", (data) => {
                console.error(`Recording Error: ${data}`);
            });
        }
        catch (error) {
            console.error("Error starting recording:", error);
            this.isRec = false;
        }
    }
    stopRecording() {
        return new Promise((resolve) => {
            if (!this.isRec || !this.recordProcess) {
                resolve();
                return;
            }
            console.log("Stopping recording...");
            this.isRec = false;
            this.recordProcess.kill('SIGINT');
            // Wait for process to end
            this.recordProcess.on("close", () => {
                console.log("Recording stopped. Transcribing...");
                resolve();
            });
        });
    }
    async transcribeAudio() {
        console.log("in transcription");
        try {
            // Check if file exists
            if (!fs.existsSync(this.tempAudioFile)) {
                throw new Error("Audio file not found");
            }
            // Using Google Cloud Speech-to-Text API via curl
            // Note: In a production environment, you should use the official SDK
            // This example assumes you have your Google Cloud credentials set up
            console.log("Transcribing audio...");
            const transcribeProcess = spawn("python3", [
                "transcribe_local.py", // Python script we created
                this.tempAudioFile
            ]);
            let outputData = "";
            let errorData = "";
            transcribeProcess.stdout.on("data", (data) => {
                outputData += data.toString();
            });
            transcribeProcess.stderr.on("data", (data) => {
                errorData += data.toString();
            });
            return new Promise((resolve, reject) => {
                transcribeProcess.on("close", (code) => {
                    if (code !== 0) {
                        console.error("Whisper error output:", errorData);
                        reject(new Error(`Local transcription process exited with code ${code}`));
                        return;
                    }
                    try {
                        resolve(outputData.trim());
                    }
                    catch (e) {
                        reject(new Error("Failed to parse local transcription output"));
                    }
                    finally {
                        // Clean up the temporary audio file
                        fs.unlinkSync(this.tempAudioFile);
                    }
                });
            });
        }
        catch (error) {
            console.error("Transcription error:", error);
            // Clean up if possible
            if (fs.existsSync(this.tempAudioFile)) {
                fs.unlinkSync(this.tempAudioFile);
            }
            return "";
        }
    }
    async chatLoop() {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        try {
            console.log("\nMCP Client Started!");
            console.log("Type your queries or 'quit' to exit.");
            while (true) {
                const command = await rl.question("\nCommand/Query: ");
                if (command.toLowerCase() === "quit") {
                    break;
                }
                else if (command.toLowerCase() === "voice") {
                    this.startRecording();
                    await rl.question("\nPlease Enter to Stop Recording...");
                    console.log("1");
                    await this.stopRecording();
                    console.log("2");
                    const transcribedText = await this.transcribeAudio();
                    if (transcribedText) {
                        console.log(`Transcribed: "${transcribedText}"`);
                        const response = await this.processQuery(transcribedText);
                        console.log("\n" + response);
                    }
                    else {
                        console.log("Transcription failed");
                    }
                }
                else {
                    const response = await this.processQuery(command);
                    console.log("\n" + response);
                }
            }
        }
        finally {
            rl.close();
        }
    }
    async cleanup() {
        if (this.isRec) {
            await this.stopRecording();
        }
        await this.mcp.close();
        if (fs.existsSync(this.tempAudioFile)) {
            fs.unlinkSync(this.tempAudioFile);
        }
    }
}
async function main() {
    if (process.argv.length < 3) {
        console.log("Usage: node index.ts <path_to_server_script>");
        return;
    }
    const mcpClient = new MCPClient();
    try {
        await mcpClient.connectToServer(process.argv[2]);
        await mcpClient.chatLoop();
    }
    catch (error) {
        console.error("Error in MCP Client: ", error);
    }
    finally {
        await mcpClient.cleanup();
        process.exit(0);
    }
}
main();
