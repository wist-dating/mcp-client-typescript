"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var sdk_1 = require("@anthropic-ai/sdk");
var index_js_1 = require("@modelcontextprotocol/sdk/client/index.js");
var stdio_js_1 = require("@modelcontextprotocol/sdk/client/stdio.js");
var readline = require("readline/promises");
var dotenv = require("dotenv");
var child_process_1 = require("child_process");
var fs = require("fs");
var path = require("path");
dotenv.config();
var ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set");
}
var MCPClient = /** @class */ (function () {
    function MCPClient() {
        this.transport = null;
        this.tools = [];
        this.isRec = false;
        this.recordProcess = null;
        this.tempAudioFile = path.join(process.cwd(), "temp_audio.wav");
        this.anthropic = new sdk_1.Anthropic({
            apiKey: ANTHROPIC_API_KEY,
        });
        this.mcp = new index_js_1.Client({ name: "mcp-client-cli", version: "1.0.0" });
    }
    MCPClient.prototype.connectToServer = function (serverScriptPath) {
        return __awaiter(this, void 0, void 0, function () {
            var isJs, isPy, command, toolsResult, e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        isJs = serverScriptPath.endsWith(".js");
                        isPy = serverScriptPath.endsWith(".py");
                        if (!isJs && !isPy) {
                            throw new Error("Server script must be a .js or .py file");
                        }
                        command = isPy
                            ? process.platform === "win32"
                                ? "python"
                                : "python3"
                            : process.execPath;
                        this.transport = new stdio_js_1.StdioClientTransport({
                            command: command,
                            args: [serverScriptPath],
                        });
                        this.mcp.connect(this.transport);
                        return [4 /*yield*/, this.mcp.listTools()];
                    case 1:
                        toolsResult = _a.sent();
                        this.tools = toolsResult.tools.map(function (tool) {
                            return {
                                name: tool.name,
                                description: tool.description,
                                input_schema: tool.inputSchema,
                            };
                        });
                        console.log("Connected to server with tools:", this.tools.map(function (_a) {
                            var name = _a.name;
                            return name;
                        }));
                        return [3 /*break*/, 3];
                    case 2:
                        e_1 = _a.sent();
                        console.log("Failed to connect to MCP server: ", e_1);
                        throw e_1;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    MCPClient.prototype.processQuery = function (query) {
        return __awaiter(this, void 0, void 0, function () {
            var messages, response, finalText, toolResults, _i, _a, content, toolName, toolArgs, result, response_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        messages = [
                            {
                                role: "user",
                                content: query,
                            },
                        ];
                        return [4 /*yield*/, this.anthropic.messages.create({
                                model: "claude-3-5-sonnet-20241022",
                                max_tokens: 1000,
                                messages: messages,
                                tools: this.tools,
                            })];
                    case 1:
                        response = _b.sent();
                        finalText = [];
                        toolResults = [];
                        _i = 0, _a = response.content;
                        _b.label = 2;
                    case 2:
                        if (!(_i < _a.length)) return [3 /*break*/, 7];
                        content = _a[_i];
                        if (!(content.type === "text")) return [3 /*break*/, 3];
                        finalText.push(content.text);
                        return [3 /*break*/, 6];
                    case 3:
                        if (!(content.type === "tool_use")) return [3 /*break*/, 6];
                        toolName = content.name;
                        toolArgs = content.input;
                        return [4 /*yield*/, this.mcp.callTool({
                                name: toolName,
                                arguments: toolArgs,
                            })];
                    case 4:
                        result = _b.sent();
                        toolResults.push(result);
                        finalText.push("[Calling tool ".concat(toolName, " with args ").concat(JSON.stringify(toolArgs), "]"));
                        messages.push({
                            role: "user",
                            content: result.content,
                        });
                        return [4 /*yield*/, this.anthropic.messages.create({
                                model: "claude-3-5-sonnet-20241022",
                                max_tokens: 1000,
                                messages: messages,
                            })];
                    case 5:
                        response_1 = _b.sent();
                        finalText.push(response_1.content[0].type === "text" ? response_1.content[0].text : "");
                        _b.label = 6;
                    case 6:
                        _i++;
                        return [3 /*break*/, 2];
                    case 7: return [2 /*return*/, finalText.join("\n")];
                }
            });
        });
    };
    MCPClient.prototype.startRecording = function () {
        if (this.isRec) {
            console.log("Already recording...");
            return;
        }
        console.log("Recording... Press Ctrl+C to stop recording.");
        this.isRec = true;
        try {
            this.recordProcess = (0, child_process_1.spawn)("sox", [
                "-d", // Use default audio device
                "-r", "16000", // Sample rate
                "-c", "1", // Mono channel
                this.tempAudioFile,
            ]);
            this.recordProcess.stderr.on("data", function (data) {
                console.error("Recording Error: ".concat(data));
            });
        }
        catch (error) {
            console.error("Error starting recording:", error);
            this.isRec = false;
        }
    };
    MCPClient.prototype.stopRecording = function () {
        var _this = this;
        return new Promise(function (resolve) {
            if (!_this.isRec || !_this.recordProcess) {
                resolve();
                return;
            }
            console.log("Stopping recording...");
            _this.isRec = false;
            // Send SIGTERM to SoX
            _this.recordProcess.kill();
            // Wait for process to end
            _this.recordProcess.on("close", function () {
                console.log("Recording stopped. Transcribing...");
                resolve();
            });
        });
    };
    MCPClient.prototype.transcribeAudio = function () {
        return __awaiter(this, void 0, void 0, function () {
            var transcribeProcess_1, outputData_1;
            var _this = this;
            return __generator(this, function (_a) {
                try {
                    // Check if file exists
                    if (!fs.existsSync(this.tempAudioFile)) {
                        throw new Error("Audio file not found");
                    }
                    // Using Google Cloud Speech-to-Text API via curl
                    // Note: In a production environment, you should use the official SDK
                    // This example assumes you have your Google Cloud credentials set up
                    console.log("Transcribing audio...");
                    transcribeProcess_1 = (0, child_process_1.spawn)("curl", [
                        "-X", "POST",
                        "-H", "Authorization: Bearer " + process.env.OPENAI_API_KEY,
                        "-H", "Content-Type: multipart/form-data",
                        "-F", "file=@" + this.tempAudioFile,
                        "-F", "model=whisper-1",
                        "https://api.openai.com/v1/audio/transcriptions"
                    ]);
                    outputData_1 = "";
                    transcribeProcess_1.stdout.on("data", function (data) {
                        outputData_1 += data.toString();
                    });
                    return [2 /*return*/, new Promise(function (resolve, reject) {
                            transcribeProcess_1.on("close", function (code) {
                                if (code !== 0) {
                                    reject(new Error("Transcription process exited with code ".concat(code)));
                                    return;
                                }
                                try {
                                    var response = JSON.parse(outputData_1);
                                    resolve(response.text || "");
                                }
                                catch (e) {
                                    reject(new Error("Failed to parse transcription response"));
                                }
                                finally {
                                    // Clean up the temporary audio file
                                    fs.unlinkSync(_this.tempAudioFile);
                                }
                            });
                        })];
                }
                catch (error) {
                    console.error("Transcription error:", error);
                    // Clean up if possible
                    if (fs.existsSync(this.tempAudioFile)) {
                        fs.unlinkSync(this.tempAudioFile);
                    }
                    return [2 /*return*/, ""];
                }
                return [2 /*return*/];
            });
        });
    };
    MCPClient.prototype.chatLoop = function () {
        return __awaiter(this, void 0, void 0, function () {
            var rl, command, transcribedText, response, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        rl = readline.createInterface({
                            input: process.stdin,
                            output: process.stdout,
                        });
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, , 15, 16]);
                        console.log("\nMCP Client Started!");
                        console.log("Type your queries or 'quit' to exit.");
                        _a.label = 2;
                    case 2:
                        if (!true) return [3 /*break*/, 14];
                        return [4 /*yield*/, rl.question("\nCommand/Query: ")];
                    case 3:
                        command = _a.sent();
                        if (!(command.toLowerCase() === "quit")) return [3 /*break*/, 4];
                        return [3 /*break*/, 14];
                    case 4:
                        if (!(command.toLowerCase() === "voice")) return [3 /*break*/, 11];
                        this.startRecording();
                        return [4 /*yield*/, rl.question("\nPlease Enter to Stop Recording...")];
                    case 5:
                        _a.sent();
                        return [4 /*yield*/, this.stopRecording()];
                    case 6:
                        _a.sent();
                        return [4 /*yield*/, this.transcribeAudio()];
                    case 7:
                        transcribedText = _a.sent();
                        if (!transcribedText) return [3 /*break*/, 9];
                        console.log("Transcribed: \"".concat(transcribedText, "\""));
                        return [4 /*yield*/, this.processQuery(transcribedText)];
                    case 8:
                        response = _a.sent();
                        console.log("\n" + response);
                        return [3 /*break*/, 10];
                    case 9:
                        console.log("Transcription failed");
                        _a.label = 10;
                    case 10: return [3 /*break*/, 13];
                    case 11: return [4 /*yield*/, this.processQuery(command)];
                    case 12:
                        response = _a.sent();
                        console.log("\n" + response);
                        _a.label = 13;
                    case 13: return [3 /*break*/, 2];
                    case 14: return [3 /*break*/, 16];
                    case 15:
                        rl.close();
                        return [7 /*endfinally*/];
                    case 16: return [2 /*return*/];
                }
            });
        });
    };
    MCPClient.prototype.cleanup = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.isRec) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.stopRecording()];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2: return [4 /*yield*/, this.mcp.close()];
                    case 3:
                        _a.sent();
                        if (fs.existsSync(this.tempAudioFile)) {
                            fs.unlinkSync(this.tempAudioFile);
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    return MCPClient;
}());
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var mcpClient, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (process.argv.length < 3) {
                        console.log("Usage: node index.ts <path_to_server_script>");
                        return [2 /*return*/];
                    }
                    mcpClient = new MCPClient();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, 5, 7]);
                    return [4 /*yield*/, mcpClient.connectToServer(process.argv[2])];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, mcpClient.chatLoop()];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 7];
                case 4:
                    error_1 = _a.sent();
                    console.error("Error in MCP Client: ", error_1);
                    return [3 /*break*/, 7];
                case 5: return [4 /*yield*/, mcpClient.cleanup()];
                case 6:
                    _a.sent();
                    process.exit(0);
                    return [7 /*endfinally*/];
                case 7: return [2 /*return*/];
            }
        });
    });
}
main();
