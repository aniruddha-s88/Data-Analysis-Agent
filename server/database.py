from sqlalchemy import create_engine

DATABASE_URL = "postgresql://postgres:root@localhost:5432/business_db"

engine = create_engine(DATABASE_URL)
