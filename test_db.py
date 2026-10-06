import psycopg
import sys

def test_db(user, password):
    try:
        conn = psycopg.connect(
            host="localhost",
            port="5432",
            dbname="postgres",
            user=user,
            password=password
        )
        print(f"Success with {user}:{password}")
        conn.close()
        return True
    except Exception as e:
        print(f"Failed {user}:{password} - {e}")
        return False

creds = [
    ("postgres", "postgres"),
    ("postgres", "root"),
    ("postgres", ""),
    ("postgres", "password")
]

for u, p in creds:
    if test_db(u, p):
        sys.exit(0)
sys.exit(1)
