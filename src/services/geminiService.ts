import { GoogleGenAI } from "@google/genai";

const getApiKey = () => {
  try {
    return process.env.GEMINI_API_KEY || "";
  } catch (e) {
    return "";
  }
};

const apiKey = getApiKey();

if (!apiKey) {
  console.warn("GEMINI_API_KEY is not defined. AI features will not work.");
}

const ai = new GoogleGenAI({ apiKey });

export const getChatResponse = async (history: { role: "user" | "model"; content: string }[]) => {
  if (!apiKey) {
    throw new Error("API Key Gemini belum diset. Silakan cek pengaturan.");
  }
  const contents = history.map((m) => ({
    role: m.role,
    parts: [{ text: m.content }],
  }));

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: contents,
    config: {
      systemInstruction: "Anda adalah LiteCoderPro Studio, AI Architect tingkat elit. Tugas utama Anda adalah membantu pengguna membangun proyek perangkat lunak besar dan ambisius. Karakter: Profesional, humoris (coder jokes), visioner, dan sangat solutif. \n\nInstruksi Khusus Management File: \nJika Anda menyarankan perubahan file, gunakan format: \n[FILE_UPDATE:nama_file.ekstensi]\nkonten kode di sini\n[END_FILE_UPDATE]\n\nAnda tidak banyak alasan. Anda langsung memberikan roadmap, struktur folder, dan implementasi kode terbaik (clean code, SOLID principle). Anda mahir di React, Node.js, Android (Kotlin/Compose), dan Flutter. Berbicaralah dalam Bahasa Indonesia yang keren.",
    },
  });

  return response.text;
};

export { ai };
