const fs = require("fs");
const path = require("path");

// Hàm xử lý bóc tách nội dung giải nghĩa
function parseDefinition(raw) {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l);
  const data = {
    partsOfSpeech: [], // Loại từ (* noun, * verb)
    fields: [], // Chuyên ngành (@Chuyên ngành kỹ thuật)
    meanings: [], // Nghĩa (- ...)
    examples: [], // Ví dụ (= ... + ...)
  };

  lines.forEach((line) => {
    if (line.startsWith("*")) {
      data.partsOfSpeech.push(line.substring(1).trim());
    } else if (line.startsWith("@")) {
      data.fields.push(line.substring(1).trim());
    } else if (line.startsWith("-")) {
      data.meanings.push(line.substring(1).trim());
    } else if (line.startsWith("=")) {
      const parts = line.substring(1).split("+");
      data.examples.push({
        q: parts[0] ? parts[0].trim() : "", // Câu hỏi/Ví dụ gốc
        a: parts[1] ? parts[1].trim() : "", // Giải nghĩa/Dịch
      });
    } else {
      // Các dòng còn lại cho vào nghĩa chung
      if (line.length > 0) data.meanings.push(line);
    }
  });
  return data;
}

function processDict(folder, idxName, dictName, outputFileName) {
  console.log(`--- Đang xử lý: ${folder} ---`);

  try {
    const idxBuffer = fs.readFileSync(path.join(folder, idxName));
    const dictBuffer = fs.readFileSync(path.join(folder, dictName));
    const results = [];
    let offset = 0;

    while (offset < idxBuffer.length) {
      // 1. Tìm điểm kết thúc của từ (null terminator \0)
      let endOfWord = offset;
      while (idxBuffer[endOfWord] !== 0 && endOfWord < idxBuffer.length) {
        endOfWord++;
      }
      const word = idxBuffer.slice(offset, endOfWord).toString("utf8");

      // 2. Đọc 4 byte offset và 4 byte size (Big Endian)
      const dataOffset = idxBuffer.readUInt32BE(endOfWord + 1);
      const dataSize = idxBuffer.readUInt32BE(endOfWord + 5);

      // 3. Trích xuất và parse nghĩa
      const rawDef = dictBuffer.slice(dataOffset, dataOffset + dataSize).toString("utf8");
      const parsed = parseDefinition(rawDef);

      // Chỉ lưu nếu từ đó không phải là thông tin database (00-database-...)
      if (!word.startsWith("00-database")) {
        results.push({
          word: word,
          pos: parsed.partsOfSpeech,
          fields: parsed.fields,
          meanings: parsed.meanings,
          examples: parsed.examples,
          type: folder, // en-vi hoặc vi-en
        });
      }

      // Di chuyển sang từ tiếp theo
      offset = endOfWord + 9;
    }

    fs.writeFileSync(outputFileName, JSON.stringify(results, null, 2));
    console.log(`✅ Thành công: ${outputFileName} (${results.length} từ)`);
  } catch (err) {
    console.error(`❌ Lỗi tại ${folder}:`, err.message);
  }
}

// Thực thi
processDict("en-vi", "star_anhviet.idx", "star_anhviet.dict", "en_vi.json");
processDict("vi-en", "star_vietanh.idx", "star_vietanh.dict", "vi_en.json");
