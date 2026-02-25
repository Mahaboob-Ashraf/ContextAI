# WhatsApp Chat Analyzer (RAG System) 💬🔍

An end-to-end Retrieval-Augmented Generation (RAG) pipeline built to ingest, process, and structure noisy WhatsApp chat exports into actionable insights.

## 🚀 Hackathon Project Overview
Group chats often contain a chaotic mix of casual conversation, critical decisions, and hidden action items. This project was developed during a hackathon to solve the problem of information retrieval in unstructured messaging apps. By leveraging Large Language Models (LLMs) and advanced vector search, this system automatically parses raw chat logs and allows users to query the chat history for actionable tasks, key decisions, and facts.

## 🛠️ Tech Stack
* **Language:** Python
* **AI/LLM Engine:** Google Gemini API
* **Database & Vector Search:** PostgreSQL with `pgvector`
* **Data Processing:** Regex & Custom Parsing Logic

## 🧠 Pipeline Architecture
1. **Ingestion & Preprocessing:** * Ingests raw `.txt` files exported directly from WhatsApp group chats.
   * Cleans the data using Regex to strip out system messages, timestamps, and metadata anomalies.
2. **Vectorization & Storage:**
   * Converts the cleaned message events into high-dimensional vector embeddings.
   * Stores these embeddings efficiently using `pgvector` in a PostgreSQL database.
3. **Retrieval Engine:**
   * Utilizes Cosine Similarity algorithms to instantly retrieve the top-5 most relevant context matches based on a user's query.
4. **Information Extraction & Synthesis:**
   * Passes the retrieved context windows into the Gemini API with highly engineered system prompts.
   * Distinguishes between casual chatter and critical project information, structuring the final output into strictly typed JSON (Action Items, Decisions Made, Key Facts).

## 👤 My Individual Contributions
As the core backend developer on this hackathon team, I took full ownership of building the backend architecture and the entire RAG pipeline from scratch. My specific contributions included:

* **Vector Database Architecture:** Architected the core RAG storage system by implementing `pgvector` to store chat message events as high-dimensional vector embeddings.
* **Semantic Search Logic:** Designed and implemented the retrieval mechanism utilizing Cosine Similarity to accurately fetch the top-5 most relevant chat context matches for any given user query.
* **Prompt Engineering & Data Structuring:** Engineered the Gemini API prompts to accurately extract unstructured text and categorize it. I designed the output pipeline to force the LLM to return strictly typed, database-ready JSON objects, completely eliminating hallucinated conversational text.
* **Data Cleaning Pipeline:** Wrote the initial Regex preprocessing scripts to strip out WhatsApp system messages and redundant metadata before embedding the text.

## 💡 Core Features
* **Semantic Querying:** Users can ask plain-English questions about past conversations, and the system retrieves the exact context and synthesizes an answer.
* **Automated Task Delegation:** Instantly converts chaotic chat logs into structured to-do lists based on context.
* **Noise Reduction:** Filters out emojis, greetings, and irrelevant chatter to focus purely on high-value information.

## ⚙️ How to Run
1. Clone this repository.
2. Ensure you have a PostgreSQL database running with the `pgvector` extension installed.
3. Install dependencies: `pip install -r requirements.txt` *(Include psycopg2, google-generativeai, etc.)*
4. Add your Gemini API key and Database URI to your environment variables.
5. Place a WhatsApp chat `.txt` export in the `data/` directory.
6. Run the embedding script to populate the database, followed by the query interface.
