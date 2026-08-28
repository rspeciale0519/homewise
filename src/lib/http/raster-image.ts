export type SupportedRasterImageType =
  | "image/jpeg"
  | "image/png"
  | "image/webp";

function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  return signature.every((value, index) => bytes[index] === value);
}

function readUint16BigEndian(bytes: Uint8Array, offset: number): number {
  return (bytes[offset]! * 0x100) + bytes[offset + 1]!;
}

function readUint16LittleEndian(bytes: Uint8Array, offset: number): number {
  return bytes[offset]! + (bytes[offset + 1]! * 0x100);
}

function readUint24LittleEndian(bytes: Uint8Array, offset: number): number {
  return bytes[offset]! +
    (bytes[offset + 1]! * 0x100) +
    (bytes[offset + 2]! * 0x10000);
}

function readUint32BigEndian(bytes: Uint8Array, offset: number): number {
  return (bytes[offset]! * 0x1000000) +
    (bytes[offset + 1]! * 0x10000) +
    (bytes[offset + 2]! * 0x100) +
    bytes[offset + 3]!;
}

function readUint32LittleEndian(bytes: Uint8Array, offset: number): number {
  return bytes[offset]! +
    (bytes[offset + 1]! * 0x100) +
    (bytes[offset + 2]! * 0x10000) +
    (bytes[offset + 3]! * 0x1000000);
}

function isJpegStartOfFrame(marker: number): boolean {
  return marker >= 0xc0 && marker <= 0xcf &&
    marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
}

function isValidJpeg(bytes: Uint8Array): boolean {
  if (bytes.length < 20 || !startsWith(bytes, [0xff, 0xd8])) return false;

  let offset = 2;
  let hasStartOfFrame = false;
  let hasScanData = false;
  let inScan = false;

  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) {
      if (!inScan) return false;
      hasScanData = true;
      offset += 1;
      continue;
    }

    while (bytes[offset] === 0xff) offset += 1;
    if (offset >= bytes.length) return false;

    const marker = bytes[offset]!;
    offset += 1;

    if (inScan) {
      if (marker === 0x00) {
        hasScanData = true;
        continue;
      }
      if (marker >= 0xd0 && marker <= 0xd7) continue;
      inScan = false;
    }

    if (marker === 0xd9) {
      return hasStartOfFrame && hasScanData && offset === bytes.length;
    }
    if (marker === 0xd8) return false;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > bytes.length) return false;

    const segmentLength = readUint16BigEndian(bytes, offset);
    if (segmentLength < 2 || offset + segmentLength > bytes.length) return false;

    if (isJpegStartOfFrame(marker)) {
      if (segmentLength < 11) return false;
      const height = readUint16BigEndian(bytes, offset + 3);
      const width = readUint16BigEndian(bytes, offset + 5);
      const componentCount = bytes[offset + 7]!;
      if (
        width === 0 ||
        height === 0 ||
        componentCount === 0 ||
        segmentLength !== 8 + (3 * componentCount)
      ) {
        return false;
      }
      hasStartOfFrame = true;
    }

    if (marker === 0xda) {
      const componentCount = bytes[offset + 2];
      if (
        !hasStartOfFrame ||
        componentCount === undefined ||
        componentCount === 0 ||
        segmentLength !== 6 + (2 * componentCount)
      ) {
        return false;
      }
      inScan = true;
    }

    offset += segmentLength;
  }

  return false;
}

const PNG_CRC_TABLE = Uint32Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit += 1) {
    crc = (crc & 1) !== 0 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  return crc >>> 0;
});

function pngCrc32(bytes: Uint8Array, start: number, end: number): number {
  let crc = 0xffffffff;
  for (let offset = start; offset < end; offset += 1) {
    crc = PNG_CRC_TABLE[(crc ^ bytes[offset]!) & 0xff]! ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunkType(bytes: Uint8Array, offset: number): string {
  return String.fromCharCode(
    bytes[offset]!,
    bytes[offset + 1]!,
    bytes[offset + 2]!,
    bytes[offset + 3]!,
  );
}

function isValidPng(bytes: Uint8Array): boolean {
  if (
    bytes.length < 57 ||
    !startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  ) {
    return false;
  }

  let offset = 8;
  let hasHeader = false;
  let hasPalette = false;
  let hasImageData = false;
  let imageDataEnded = false;
  let imageDataByteCount = 0;
  const imageDataHeader: number[] = [];
  let colorType = -1;

  while (offset < bytes.length) {
    if (offset + 12 > bytes.length) return false;
    const dataLength = readUint32BigEndian(bytes, offset);
    const typeOffset = offset + 4;
    const dataOffset = offset + 8;
    const dataEnd = dataOffset + dataLength;
    const chunkEnd = dataEnd + 4;
    if (dataEnd < dataOffset || chunkEnd > bytes.length) return false;

    const type = pngChunkType(bytes, typeOffset);
    if (!/^[A-Za-z]{4}$/.test(type)) return false;
    const storedCrc = readUint32BigEndian(bytes, dataEnd);
    if (pngCrc32(bytes, typeOffset, dataEnd) !== storedCrc) return false;

    if (!hasHeader) {
      if (type !== "IHDR" || dataLength !== 13) return false;
      const width = readUint32BigEndian(bytes, dataOffset);
      const height = readUint32BigEndian(bytes, dataOffset + 4);
      const bitDepth = bytes[dataOffset + 8]!;
      colorType = bytes[dataOffset + 9]!;
      const allowedDepths: Readonly<Record<number, readonly number[]>> = {
        0: [1, 2, 4, 8, 16],
        2: [8, 16],
        3: [1, 2, 4, 8],
        4: [8, 16],
        6: [8, 16],
      };
      if (
        width === 0 ||
        height === 0 ||
        !allowedDepths[colorType]?.includes(bitDepth) ||
        bytes[dataOffset + 10] !== 0 ||
        bytes[dataOffset + 11] !== 0 ||
        (bytes[dataOffset + 12] !== 0 && bytes[dataOffset + 12] !== 1)
      ) {
        return false;
      }
      hasHeader = true;
    } else if (type === "IHDR") {
      return false;
    }

    if (type === "PLTE") {
      if (hasImageData || colorType === 0 || colorType === 4) return false;
      if (dataLength === 0 || dataLength % 3 !== 0 || dataLength > 768) return false;
      hasPalette = true;
    } else if (type === "IDAT") {
      if (imageDataEnded || dataLength === 0) return false;
      hasImageData = true;
      imageDataByteCount += dataLength;
      for (
        let dataIndex = 0;
        imageDataHeader.length < 2 && dataIndex < dataLength;
        dataIndex += 1
      ) {
        imageDataHeader.push(bytes[dataOffset + dataIndex]!);
      }
    } else if (hasImageData) {
      imageDataEnded = true;
    }

    if (type === "IEND") {
      const compressionMethod = imageDataHeader[0];
      const compressionFlags = imageDataHeader[1];
      const hasValidZlibHeader =
        compressionMethod !== undefined &&
        compressionFlags !== undefined &&
        (compressionMethod & 0x0f) === 8 &&
        (compressionMethod >> 4) <= 7 &&
        (compressionFlags & 0x20) === 0 &&
        ((compressionMethod * 256) + compressionFlags) % 31 === 0;
      return dataLength === 0 &&
        hasImageData &&
        imageDataByteCount >= 6 &&
        hasValidZlibHeader &&
        (colorType !== 3 || hasPalette) &&
        chunkEnd === bytes.length;
    }

    const criticalChunk = (bytes[typeOffset]! & 0x20) === 0;
    if (criticalChunk && !["IHDR", "PLTE", "IDAT", "IEND"].includes(type)) {
      return false;
    }
    offset = chunkEnd;
  }

  return false;
}

function webpChunkType(bytes: Uint8Array, offset: number): string {
  return String.fromCharCode(
    bytes[offset]!,
    bytes[offset + 1]!,
    bytes[offset + 2]!,
    bytes[offset + 3]!,
  );
}

function isValidWebpImageChunk(
  bytes: Uint8Array,
  type: string,
  dataOffset: number,
  dataLength: number,
): boolean {
  if (type === "VP8 ") {
    if (dataLength <= 10 || (bytes[dataOffset]! & 1) !== 0) return false;
    if (!startsWith(bytes.subarray(dataOffset + 3), [0x9d, 0x01, 0x2a])) return false;
    const width = readUint16LittleEndian(bytes, dataOffset + 6) & 0x3fff;
    const height = readUint16LittleEndian(bytes, dataOffset + 8) & 0x3fff;
    return width > 0 && height > 0;
  }
  if (type === "VP8L") {
    if (dataLength <= 5 || bytes[dataOffset] !== 0x2f) return false;
    const width = 1 + bytes[dataOffset + 1]! +
      ((bytes[dataOffset + 2]! & 0x3f) << 8);
    const height = 1 + (bytes[dataOffset + 2]! >> 6) +
      (bytes[dataOffset + 3]! << 2) +
      ((bytes[dataOffset + 4]! & 0x0f) << 10);
    return width > 0 && height > 0 && (bytes[dataOffset + 4]! & 0xe0) === 0;
  }
  return false;
}

function isValidWebp(bytes: Uint8Array): boolean {
  if (
    bytes.length < 26 ||
    !startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) ||
    !startsWith(bytes.subarray(8), [0x57, 0x45, 0x42, 0x50]) ||
    readUint32LittleEndian(bytes, 4) + 8 !== bytes.length
  ) {
    return false;
  }

  let offset = 12;
  let firstChunk = true;
  let hasImageData = false;

  while (offset < bytes.length) {
    if (offset + 8 > bytes.length) return false;
    const type = webpChunkType(bytes, offset);
    const dataLength = readUint32LittleEndian(bytes, offset + 4);
    const dataOffset = offset + 8;
    const dataEnd = dataOffset + dataLength;
    const paddedEnd = dataEnd + (dataLength & 1);
    if (dataEnd < dataOffset || paddedEnd > bytes.length) return false;
    if ((dataLength & 1) === 1 && bytes[dataEnd] !== 0) return false;

    if (firstChunk) {
      if (!["VP8 ", "VP8L", "VP8X"].includes(type)) return false;
      if (type === "VP8X") {
        if (
          dataLength !== 10 ||
          (bytes[dataOffset]! & 0xc3) !== 0 ||
          bytes[dataOffset + 1] !== 0 ||
          bytes[dataOffset + 2] !== 0 ||
          bytes[dataOffset + 3] !== 0 ||
          readUint24LittleEndian(bytes, dataOffset + 4) + 1 <= 0 ||
          readUint24LittleEndian(bytes, dataOffset + 7) + 1 <= 0
        ) {
          return false;
        }
      }
      firstChunk = false;
    } else if (type === "VP8X" || type === "ANIM" || type === "ANMF") {
      return false;
    }

    if (type === "VP8 " || type === "VP8L") {
      if (
        hasImageData ||
        !isValidWebpImageChunk(bytes, type, dataOffset, dataLength)
      ) {
        return false;
      }
      hasImageData = true;
    }

    offset = paddedEnd;
  }

  return offset === bytes.length && hasImageData;
}

export function detectRasterImageType(
  bytes: Uint8Array,
): SupportedRasterImageType | null {
  if (isValidJpeg(bytes)) return "image/jpeg";
  if (isValidPng(bytes)) return "image/png";
  if (isValidWebp(bytes)) return "image/webp";
  return null;
}

export function rasterImageExtension(type: SupportedRasterImageType): string {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}
