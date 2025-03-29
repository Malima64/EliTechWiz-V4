"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { hango } = require("../framework/hango");
const fetch = require("node-fetch");
const FormData = require("form-data");
const { fileTypeFromBuffer } = require("file-type");
const { unlink } = require("fs/promises");

const MAX_FILE_SIZE_MB = 200;

async function uploadMedia(buffer) {
  try {
    const { ext } = await fileTypeFromBuffer(buffer);
    const bodyForm = new FormData();
    bodyForm.append("fileToUpload", buffer, "file." + ext);
    bodyForm.append("reqtype", "fileupload");

    const res = await fetch("https://catbox.moe/user/api.php", {
      method: "POST",
      body: bodyForm,
    });

    if (!res.ok) {
      throw new Error(`Upload failed with status ${res.status}: ${res.statusText}`);
    }

    const data = await res.text();
    return data;
  } catch (error) {
    console.error("Error during media upload:", error);
    throw new Error('Failed to upload media');
  }
}

// hansurl command function to handle media upload via hango
hango({
  nomCom: "anywayurl", // Command name
  reaction: "👊", 
  nomFichier: __filename 
}, async (dest, hn, commandeOptions) => {

  const prefixMatch = dest.match(/^[\\/!#.]/);
  const prefix = prefixMatch ? prefixMatch[0] : '/';
  const cmd = dest.startsWith(prefix) ? dest.slice(prefix.length).split(' ')[0].toLowerCase() : '';

  if (cmd === 'anywayurl') {
    if (!hn.quoted || !['imageMessage', 'videoMessage', 'audioMessage'].includes(hn.quoted.mtype)) {
      return hn.sendMessage(dest, { text: `Send/Reply/Quote an image, video, or audio to upload \n*${prefix + cmd}*` });
    }

    try {
      const loadingMessages = [
        "*「▰▰▰▱▱▱▱▱▱▱」*",
        "*「▰▰▰▰▱▱▱▱▱▱」*",
        "*「▰▰▰▰▰▱▱▱▱▱」*",
        "*「▰▰▰▰▰▰▱▱▱▱」*",
        "*「▰▰▰▰▰▰▰▱▱▱」*",
        "*「▰▰▰▰▰▰▰▰▱▱」*",
        "*「▰▰▰▰▰▰▰▰▰▱」*",
        "*「▰▰▰▰▰▰▰▰▰▰」*",
      ];

      const loadingMessageCount = loadingMessages.length;
      let currentMessageIndex = 0;

      const { key } = await hn.sendMessage(dest, { text: loadingMessages[currentMessageIndex] });

      const loadingInterval = setInterval(() => {
        currentMessageIndex = (currentMessageIndex + 1) % loadingMessageCount;
        hn.sendMessage(dest, { text: loadingMessages[currentMessageIndex] }, { messageId: key });
      }, 500);

      const media = await hn.quoted.download();
      if (!media) throw new Error('Failed to download media.');

      const fileSizeMB = media.length / (1024 * 1024);
      if (fileSizeMB > MAX_FILE_SIZE_MB) {
        clearInterval(loadingInterval);
        return hn.sendMessage(dest, { text: `File size exceeds the limit of ${MAX_FILE_SIZE_MB}MB.` });
      }

      const mediaUrl = await uploadMedia(media);

      clearInterval(loadingInterval);
      await hn.sendMessage(dest, { text: '✅ Loading complete.' });

      const mediaType = getMediaType(hn.quoted.mtype);
      if (mediaType === 'audio') {
        await hn.sendMessage(dest, { text: `*Hey ${dest} Here Is Your Audio URL*\n*Url:* ${mediaUrl}` });
      } else {
        await hn.sendMessage(dest, { [mediaType]: { url: mediaUrl }, caption: `*Hey ${dest} Here Is Your Media*\n*Url:* ${mediaUrl}` });
      }

    } catch (error) {
      console.error('Error processing media:', error);
      hn.sendMessage(dest, { text: 'Error processing media.' });
    }
  }
});

// Helper function to determine media type
const getMediaType = (mtype) => {
  switch (mtype) {
    case 'imageMessage':
      return 'image';
    case 'videoMessage':
      return 'video';
    case 'audioMessage':
      return 'audio';
    default:
      return null;
  }
};
