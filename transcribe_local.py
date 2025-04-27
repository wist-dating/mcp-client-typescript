import sys
import speech_recognition as sr

def main(audio_file_path):
    r = sr.Recognizer()

    with sr.AudioFile(audio_file_path) as source:
        audio_data = r.record(source)

    try:
        # Use macOS built-in speech recognition (Sphinx is offline, but for best results, use Google if online)
        text = r.recognize_sphinx(audio_data)
        print(text)
    except sr.UnknownValueError:
        print("Could not understand audio")
    except sr.RequestError as e:
        print(f"Speech recognition error: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python transcribe_local.py <audio_file_path>")
        sys.exit(1)

    main(sys.argv[1])