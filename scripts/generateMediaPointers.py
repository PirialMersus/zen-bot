import os
import re
import sys
import json
import time
import urllib.request
import urllib.error
from faster_whisper import WhisperModel

project_root_directory = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
telegram_export_directory_path = "/Users/gennadiifesenko/Downloads/Telegram Desktop/ChatExport_2026-11-19"
cache_output_file_path = os.path.join(project_root_directory, "data", "cache_media_transcriptions.json")
final_pointers_output_file_path = os.path.join(project_root_directory, "data", "pointers.master.media.js")

def extract_gemini_api_key(env_file_path):
    with open(env_file_path, "r", encoding="utf-8") as env_file:
        for single_line in env_file:
            stripped_line = single_line.strip()
            if stripped_line.startswith("GEMINI_API_KEY="):
                return stripped_line.split("=", 1)[1].strip()
    return None

gemini_api_key = extract_gemini_api_key(os.path.join(project_root_directory, ".env"))
if not gemini_api_key:
    sys.exit("GEMINI_API_KEY is not defined")

def clean_html_markup(raw_html_string):
    step_with_newlines = re.sub(r"<br\s*/?>", "\n", raw_html_string, flags=re.IGNORECASE)
    cleaned_plain_text = re.sub(r"<[^>]+>", "", step_with_newlines)
    return cleaned_plain_text.strip()

def is_target_author(author_name_string):
    if not author_name_string:
        return False
    normalized_author_name = author_name_string.lower()
    return "ясност" in normalized_author_name or "андрей" in normalized_author_name

def find_export_html_files(export_directory_path):
    directory_entries = os.listdir(export_directory_path)
    html_file_names = [f for f in directory_entries if f.startswith("messages") and f.endswith(".html")]

    def extract_file_index(file_name_string):
        numeric_match = re.search(r"\d+", file_name_string)
        return int(numeric_match.group(0)) if numeric_match else 1

    html_file_names.sort(key=extract_file_index)
    return [os.path.join(export_directory_path, f) for f in html_file_names]

def extract_master_media_items(html_file_paths_list):
    media_items_list = []
    processed_relative_paths_set = set()
    current_author_name = "Неизвестно"

    for html_file_path in html_file_paths_list:
        with open(html_file_path, "r", encoding="utf-8") as html_file:
            raw_content = html_file.read()

        raw_message_blocks = re.split(r"(?=<div class=\"message\b)", raw_content)
        for raw_message_block in raw_message_blocks:
            if not raw_message_block.strip():
                continue

            author_match = re.search(r"<div class=\"from_name\">\s*([\s\S]*?)\s*</div>", raw_message_block)
            if author_match:
                cleaned_author = clean_html_markup(author_match.group(1))
                current_author_name = re.sub(r"\s+\d{2}\.\d{2}\.\d{4}.*$", "", cleaned_author).strip()

            if not is_target_author(current_author_name):
                continue

            media_matches = re.findall(
                r"href=\"((?:voice_messages|video_files|audio_files|round_video_messages)/[^\"]+\.(?:ogg|mp3|mp4|mov|m4a))\"",
                raw_message_block,
                flags=re.IGNORECASE
            )
            if not media_matches:
                continue

            date_match = re.search(r"title=\"(\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}:\d{2})", raw_message_block)
            message_date = date_match.group(1) if date_match else ""

            text_match = re.search(r"<div class=\"text\">\s*([\s\S]*?)\s*</div>", raw_message_block)
            accompanying_text = clean_html_markup(text_match.group(1)) if text_match else ""

            for relative_media_path in media_matches:
                if relative_media_path in processed_relative_paths_set:
                    continue
                processed_relative_paths_set.add(relative_media_path)
                media_items_list.append({
                    "relative_file_path": relative_media_path,
                    "absolute_file_path": os.path.join(telegram_export_directory_path, relative_media_path),
                    "author": current_author_name,
                    "date": message_date,
                    "accompanying_text": accompanying_text
                })

    return media_items_list

def request_pointers_extraction_from_text(transcribed_speech_text, accompanying_message_text, retry_count_remaining=3):
    preferred_models_list = ["gemini-3-flash-preview", "gemini-3.1-flash-lite"]
    model_name = preferred_models_list[0] if retry_count_remaining % 2 == 1 else preferred_models_list[1]
    api_endpoint_url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={gemini_api_key}"

    prompt_instruction = f"""
Ты — исследователь духовных указателей (адвайта, недвойственность, дзен).
Перед тобой дословная транскрибация аудио/видео сообщения Мастера («Хочу Ясности»).

Транскрибация речи:
\"\"\"{transcribed_speech_text}\"\"\"

Сопроводительный текст к сообщению (если был):
\"\"\"{accompanying_message_text}\"\"\"

Твоя задача — извлечь из этой речи все содержательные духовные указатели (поинтеры).

Требования к поинтерам:
1. Поинтер должен отражать ключевую суть, указание на природу ума, тишину, разотождествление, присутствие или ответ по сути поиска.
2. Длина поинтера: от 1 до 10 предложений (емко, насыщенно смыслом, без вводных приветствий, прощаний, бытовых оговорок).
3. Сохраняй стиль Мастера. Не делай огромных полотен текста.
4. Если в записи содержится несколько независимых ценных указателей, раздели их на отдельные поинтеры.
5. Если речь носит чисто бытовой характер (проверка связи, бытовые дела котиков, приветствие без духовного содержания), верни пустой список поинтеров.
6. Для каждого поинтера укажи:
   - "text": текст указателя;
   - "tags": массив от 1 до 2 тегов strictly из списка: ["тишина", "рекомендации", "наблюдения", "мудрость"].

Ответь строго валидным JSON-объектом:
{{
  "pointers": [
    {{
      "text": "текст поинтера",
      "tags": ["тишина"]
    }}
  ]
}}
"""

    request_payload = {
        "contents": [
            {
                "parts": [
                    {
                        "text": prompt_instruction
                    }
                ]
            }
        ],
        "generationConfig": {
            "responseMimeType": "application/json"
        }
    }

    payload_bytes = json.dumps(request_payload).encode("utf-8")
    http_request = urllib.request.Request(
        api_endpoint_url,
        data=payload_bytes,
        headers={"Content-Type": "application/json"}
    )

    try:
        with urllib.request.urlopen(http_request, timeout=25) as http_response:
            response_data = json.loads(http_response.read().decode("utf-8"))
            candidate_part = response_data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
            if not candidate_part:
                return []
            parsed_result = json.loads(candidate_part)
            return parsed_result.get("pointers", [])
    except urllib.error.HTTPError as http_error:
        print(f"      HTTP ошибка Gemini API {http_error.code}: {http_error.reason}", flush=True)
        if retry_count_remaining > 0:
            time.sleep(4)
            return request_pointers_extraction_from_text(transcribed_speech_text, accompanying_message_text, retry_count_remaining - 1)
        return []
    except Exception as generic_network_error:
        print(f"      Сетевая ошибка Gemini API: {generic_network_error}", flush=True)
        if retry_count_remaining > 0:
            time.sleep(4)
            return request_pointers_extraction_from_text(transcribed_speech_text, accompanying_message_text, retry_count_remaining - 1)
        return []

def load_existing_cache():
    if os.path.exists(cache_output_file_path):
        try:
            with open(cache_output_file_path, "r", encoding="utf-8") as cache_file:
                return json.load(cache_file)
        except Exception:
            return {}
    return {}

def save_current_cache(cache_dictionary):
    with open(cache_output_file_path, "w", encoding="utf-8") as cache_file:
        json.dump(cache_dictionary, cache_file, ensure_ascii=False, indent=2)

def escape_template_string_characters(input_string):
    return (
        input_string
        .replace("\\", "\\\\")
        .replace("`", "\\`")
        .replace("${", "\\${")
    )

def write_final_pointers_file(pointers_list):
    code_lines_list = ["export default ["]

    for pointer_index, pointer_item in enumerate(pointers_list):
        item_number = pointer_index + 1
        escaped_text = escape_template_string_characters(pointer_item.get("text", ""))
        tags_json = json.dumps(pointer_item.get("tags", ["тишина"]), ensure_ascii=False)

        code_lines_list.append("  {")
        code_lines_list.append(f"    number: {item_number},")
        code_lines_list.append(f"    text: `{escaped_text}`,")
        code_lines_list.append('    source: "Хочу Ясности",')
        code_lines_list.append(f"    tags: {tags_json}")
        trailing_comma = "" if pointer_index == len(pointers_list) - 1 else ","
        code_lines_list.append("  }" + trailing_comma)

    code_lines_list.append("];")
    code_lines_list.append("")

    with open(final_pointers_output_file_path, "w", encoding="utf-8") as output_file:
        output_file.write("\n".join(code_lines_list))

def main():
    print("Инициализация локальной модели faster-whisper (base)...", flush=True)
    whisper_model = WhisperModel("base", device="cpu", compute_type="int8", local_files_only=True)
    print("Модель успешно загружена в память.", flush=True)

    export_html_files = find_export_html_files(telegram_export_directory_path)
    target_media_items = extract_master_media_items(export_html_files)
    print(f"Всего целевых медиафайлов: {len(target_media_items)}", flush=True)

    cache_data = load_existing_cache()
    all_pointers_list = []

    for cache_key in cache_data:
        cached_entry = cache_data[cache_key]
        if isinstance(cached_entry.get("pointers"), list):
            all_pointers_list.extend(cached_entry["pointers"])

    print(f"Загружено из кэша уже обработанных файлов: {len(cache_data)}, поинтеров: {len(all_pointers_list)}", flush=True)

    for media_index, media_item in enumerate(target_media_items):
        relative_path = media_item["relative_file_path"]
        absolute_path = media_item["absolute_file_path"]

        if relative_path in cache_data:
            continue

        if not os.path.exists(absolute_path):
            continue

        print(f"[{media_index + 1}/{len(target_media_items)}] Транскрибация: {relative_path}", flush=True)
        start_transcription_time = time.time()

        try:
            segments_iterator, speech_info = whisper_model.transcribe(
                absolute_path,
                language="ru",
                beam_size=5,
                vad_filter=True
            )
            segments_list = list(segments_iterator)
            full_transcribed_text = " ".join(s.text.strip() for s in segments_list).strip()
            elapsed_seconds = time.time() - start_transcription_time
            print(f"   Расшифровано за {elapsed_seconds:.1f} сек. Длина текста: {len(full_transcribed_text)} симв.", flush=True)
        except Exception as transcription_error:
            print(f"   Ошибка расшифровки: {transcription_error}", flush=True)
            continue

        extracted_pointers = []
        if len(full_transcribed_text) > 40:
            extracted_pointers = request_pointers_extraction_from_text(
                full_transcribed_text,
                media_item["accompanying_text"]
            )
            print(f"   Извлечено поинтеров: {len(extracted_pointers)}", flush=True)

        cache_data[relative_path] = {
            "date": media_item["date"],
            "author": media_item["author"],
            "transcription": full_transcribed_text,
            "pointers": extracted_pointers
        }
        save_current_cache(cache_data)

        if extracted_pointers:
            all_pointers_list.extend(extracted_pointers)
            write_final_pointers_file(all_pointers_list)

        time.sleep(0.3)

    print(f"Обработка завершена! Всего поинтеров собрано: {len(all_pointers_list)}", flush=True)
    write_final_pointers_file(all_pointers_list)

if __name__ == "__main__":
    main()
