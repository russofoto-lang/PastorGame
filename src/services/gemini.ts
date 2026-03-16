import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

async function callClaude(prompt: string, system?: string) {
  try {
    const response = await fetch("/api/claude", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, system })
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    // Rimuove i backtick markdown che Claude aggiunge a volte
    const text = (data.text || '').replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    return text;
  } catch (error) {
    console.error("Claude fallback error:", error);
    throw error;
  }
}

export interface Question {
  question: string;
  answer: string;
  options?: string[]; // Optional for multiple choice
}

export interface TimelineEvent {
  event: string;
  year: number;
}

export const geminiService = {
  async generateGenioQuestions(topic: string): Promise<Question[]> {
    const system = "Sei un esperto di quiz. Rispondi esclusivamente in formato JSON valido.";
    const prompt = `Genera 5 domande su "${topic}". 
      Le domande devono avere un livello di difficoltà CRESCENTE: la prima deve essere facile, l'ultima molto difficile/di nicchia.
      TUTTE le domande devono essere a scelta multipla con 4 opzioni (indica quella corretta).
      Rispondi esclusivamente in lingua italiana in formato JSON con questa struttura: [{"question": "...", "answer": "...", "options": ["...", "...", "...", "..."]}].`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                answer: { type: Type.STRING },
                options: { 
                  type: Type.ARRAY, 
                  items: { type: Type.STRING },
                },
              },
              required: ["question", "answer", "options"],
            },
          },
        },
      });
      return JSON.parse(response.text || "[]");
    } catch (e) {
      console.log("Gemini failed, trying Claude...", e);
      const text = await callClaude(prompt, system);
      return JSON.parse(text || "[]");
    }
  },

  async generateMemoriaTopics(): Promise<string[]> {
    return [
      "Premi Oscar (Film e Attori)",
      "Calcio Serie A (Anni 90 - Oggi)",
      "Musica Pop e Rock (Internazionale e Italiana)",
      "Televisione Italiana (Programmi e Conduttori)",
      "Cucina e Piatti Tipici Regionali"
    ];
  },

  async generateMemoriaList(category: string): Promise<{ item: string; hint: string }[]> {
    const system = "Sei un esperto di cultura generale. Rispondi esclusivamente in formato JSON valido.";
    const prompt = `Per la categoria "${category}", genera una lista di 10 elementi. 
      La difficoltà deve essere CRESCENTE: l'elemento 10 deve essere il più facile/ovvio, mentre l'elemento 1 deve essere il più difficile/per esperti. 
      Per ogni elemento fornisci un suggerimento (una breve descrizione o indizio). 
      Rispondi in italiano in formato JSON con questa struttura: [{"item": "...", "hint": "..."}].`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                item: { type: Type.STRING },
                hint: { type: Type.STRING },
              },
              required: ["item", "hint"],
            },
          },
        },
      });
      return JSON.parse(response.text || "[]");
    } catch (e) {
      console.log("Gemini failed, trying Claude...", e);
      const text = await callClaude(prompt, system);
      return JSON.parse(text || "[]");
    }
  },

  async generateTimelineCategories(): Promise<string[]> {
    return [
      "Storia d'Italia",
      "Scoperte Scientifiche",
      "Storia del Cinema",
      "Musica Moderna (Rock, Pop, Leggera)",
      "Grandi Invenzioni",
      "Eventi Sportivi Mondiali"
    ];
  },

  async generateTimelineEvents(theme: string, count: number): Promise<TimelineEvent[]> {
    const system = "Sei un esperto di storia e cultura. Rispondi esclusivamente in formato JSON valido.";
    const prompt = `Genera ${count} eventi storici o culturali legati a "${theme}" con i loro anni specifici. 
      Assicurati che gli anni siano distinti e coprano un arco temporale significativo. 
      Rispondi esclusivamente in lingua italiana in formato JSON con questa struttura: [{"event": "...", "year": 2024}].`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                event: { type: Type.STRING },
                year: { type: Type.NUMBER },
              },
              required: ["event", "year"],
            },
          },
        },
      });
      return JSON.parse(response.text || "[]");
    } catch (e) {
      console.log("Gemini failed, trying Claude...", e);
      const text = await callClaude(prompt, system);
      return JSON.parse(text || "[]");
    }
  },

  async generateRingCategories(): Promise<string[]> {
    return [
      "Geografia",
      "Sport",
      "Musica Moderna",
      "Cinema e TV",
      "Cucina",
      "Cultura Generale"
    ];
  },

  async generateRingTheme(category?: string): Promise<string> {
    const prompt = category 
      ? `Genera una categoria specifica per il gioco "Il Ring" (nomi a ritmo serrato) basata sul tema "${category}". Esempio: se il tema è Geografia, potresti dire "Capitali Europee" o "Fiumi Italiani". Restituisci solo il nome della categoria specifica in lingua italiana.`
      : "Genera una categoria semplice ma profonda per un gioco di nomi 1v1 a ritmo serrato (es. 'Città italiane che iniziano con la B', 'Stati dell'Africa', 'Personaggi Marvel', 'Formati di pasta'). Restituisci solo il nome della categoria in lingua italiana.";
    
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
      });
      return response.text || "Città italiane che iniziano con la B";
    } catch (e) {
      console.log("Gemini failed, trying Claude...", e);
      const text = await callClaude(prompt, "Rispondi solo con il nome della categoria, niente altro.");
      return text || "Città italiane che iniziano con la B";
    }
  },

  async generateChiEPersonaggi(): Promise<{ name: string; hint: string }[]> {
    const system = "Sei un esperto di cultura generale. Rispondi esclusivamente in formato JSON valido.";
    const prompt = `Genera una lista di 5 personaggi famosi con difficoltà VARIABILE:
    - 2 famosissimi a livello mondiale (es. Papa Francesco, Ronaldo, Madonna)
    - 2 mediamente noti, famosi in Italia o in un settore specifico (es. un politico italiano, un atleta olimpico)
    - 1 meno noto, di nicchia ma verificabile (es. uno scienziato, un artista, uno sportivo di sport minore)
    Mix obbligatorio di categorie: sport, musica, cinema/TV, politica/storia, scienza/cultura.
    Devono essere personaggi reali con pagina Wikipedia che abbia sicuramente una foto.
    Per ognuno un indizio breve (categoria e periodo, MAI il nome).
    Rispondi in italiano in formato JSON: [{"name": "Nome Cognome", "hint": "Calciatore italiano anni 90"}].`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                hint: { type: Type.STRING },
              },
              required: ["name", "hint"],
            },
          },
        },
      });
      return JSON.parse(response.text || "[]");
    } catch (e) {
      console.log("Gemini failed, trying Claude...", e);
      const text = await callClaude(prompt, system);
      return JSON.parse(text || "[]");
    }
  },

  async generateDuelloWords(): Promise<{ word: string; definition: string }[]> {
    const system = "Sei un esperto di cultura generale italiana. Rispondi esclusivamente in formato JSON valido.";
    const prompt = `Genera esattamente 15 parole in italiano per un gioco televisivo tipo 'Il Duello' dell'Eredità.
      Le parole devono essere:
      - Mix di difficoltà: 7 di media difficoltà e 8 più difficili/insolite
      - Lunghezza tra 5 e 14 lettere (no parole con apostrofo)
      - Provenienti da categorie diverse: storia, geografia, scienza, arte, letteratura, gastronomia, sport, musica
      - Per ogni parola fornisci una definizione breve ma precisa (max 15 parole), come un dizionario enciclopedico
      Rispondi ESCLUSIVAMENTE in italiano in formato JSON: [{"word": "PAROLA", "definition": "Definizione breve e precisa della parola"}]`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                word: { type: Type.STRING },
                definition: { type: Type.STRING },
              },
              required: ["word", "definition"],
            },
          },
        },
      });
      return JSON.parse(response.text || "[]");
    } catch (e) {
      console.log("Gemini failed, trying Claude...", e);
      const text = await callClaude(prompt, system);
      return JSON.parse(text || "[]");
    }
  },

  async getWikipediaPhoto(name: string): Promise<string | null> {
    try {
      // Cerca il titolo esatto della pagina Wikipedia
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(name)}&prop=pageimages&format=json&pithumbsize=600&origin=*`;
      const res = await fetch(searchUrl);
      const data = await res.json();
      const pages = data.query.pages;
      const page = Object.values(pages)[0] as any;
      if (page?.thumbnail?.source) return page.thumbnail.source;

      // Fallback: cerca per nome
      const searchRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(name)}&format=json&origin=*`);
      const searchData = await searchRes.json();
      const firstResult = searchData.query?.search?.[0];
      if (!firstResult) return null;

      const imgRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(firstResult.title)}&prop=pageimages&format=json&pithumbsize=600&origin=*`);
      const imgData = await imgRes.json();
      const imgPages = imgData.query.pages;
      const imgPage = Object.values(imgPages)[0] as any;
      return imgPage?.thumbnail?.source || null;
    } catch {
      return null;
    }
  },
};
