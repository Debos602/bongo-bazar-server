import multer from 'multer';
import path from 'path';
import fs from 'fs';
import cloudinary from './cloudinary';


// Disk storage (keeps compatibility)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(process.cwd(), '/uploads'));
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

// Memory storage for direct buffer uploads
const memoryStorage = multer.memoryStorage();

const uploadDisk = multer({ storage });
const uploadMemory = multer({ storage: memoryStorage });

async function uploadFilePathToCloudinary(filePath: string, originalname?: string) {
  const uploadResult = await cloudinary.uploader.upload(filePath, {
    public_id: `${originalname ?? 'file'}-${Date.now()}`,
    folder: 'ph-health-care',
  });

  try { fs.unlinkSync(filePath); } catch (e) { /* ignore */ }
  return uploadResult;
}

function uploadBufferToCloudinary(buffer: Buffer, originalname?: string) {
  return new Promise<any>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { public_id: `${originalname ?? 'file'}-${Date.now()}`, folder: 'ph-health-care' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
}

// Backwards-compatible wrapper: accept multer file
async function uploadToCloudinary(file: Express.Multer.File) {
  if ((file as any).buffer) {
    return uploadBufferToCloudinary((file as any).buffer, file.originalname);
  }
  return uploadFilePathToCloudinary((file as any).path, file.originalname);
}

export const fileUploader = {
  // original exports
  upload: uploadDisk,
  uploadToCloudinary,

  // new helpers
  uploadDisk,
  uploadMemory,
  uploadFilePathToCloudinary,
  uploadBufferToCloudinary,
};