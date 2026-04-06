from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma

def get_vector_store():
    embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
    db = Chroma(persist_directory="./chroma_db", embedding_function=embeddings)
    return db
