import os
from contextlib import contextmanager

import mysql.connector
from dotenv import load_dotenv

load_dotenv()

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "127.0.0.1"),
    "port": int(os.getenv("DB_PORT", "3306")),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", ""),
}
DB_NAME = os.getenv("DB_NAME", "vizion")


class Database:
    def __init__(self, raw_connection):
        self.raw_connection = raw_connection

    def execute(self, query, parameters=()):
        query = query.replace("?", "%s").replace("INSERT OR IGNORE", "INSERT IGNORE")
        cursor = self.raw_connection.cursor(dictionary=True)
        cursor.execute(query, parameters)
        return cursor

    def executemany(self, query, parameters):
        query = query.replace("?", "%s").replace("INSERT OR IGNORE", "INSERT IGNORE")
        cursor = self.raw_connection.cursor()
        cursor.executemany(query, parameters)
        cursor.close()

    def executescript(self, script):
        cursor = self.raw_connection.cursor()
        for statement in script.split(";"):
            statement = statement.strip()
            if statement:
                cursor.execute(statement)
        cursor.close()

    def __enter__(self):
        return self

    def __exit__(self, exception_type, exception, traceback):
        try:
            if exception_type:
                self.raw_connection.rollback()
            else:
                self.raw_connection.commit()
        finally:
            self.raw_connection.close()


def create_database():
    server = mysql.connector.connect(**DB_CONFIG)
    cursor = server.cursor()
    cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{DB_NAME}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
    cursor.close()
    server.close()


def connection():
    return Database(mysql.connector.connect(database=DB_NAME, **DB_CONFIG))


def initialize():
    create_database()
    with connection() as database:
        database.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                email VARCHAR(254) PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role ENUM('student', 'company') NOT NULL,
                interests VARCHAR(2000) NOT NULL DEFAULT '',
                skills VARCHAR(2000) NOT NULL DEFAULT '',
                profile_photo MEDIUMTEXT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS login_events (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_email VARCHAR(254) NOT NULL,
                logged_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_email) REFERENCES users(email) ON DELETE CASCADE,
                INDEX login_events_email_date (user_email, logged_at)
            );
            CREATE TABLE IF NOT EXISTS password_reset_otps (
                email VARCHAR(254) PRIMARY KEY,
                role ENUM('student', 'company') NOT NULL,
                code_hash CHAR(64) NOT NULL,
                expires_at DATETIME NOT NULL,
                attempts TINYINT NOT NULL DEFAULT 0,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (email) REFERENCES users(email) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS projects (
                id INT PRIMARY KEY AUTO_INCREMENT,
                student_email VARCHAR(254) NOT NULL,
                career_path VARCHAR(100) NOT NULL,
                title VARCHAR(150) NOT NULL,
                github_url VARCHAR(500) NOT NULL,
                status VARCHAR(40) NOT NULL DEFAULT 'Under review',
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (student_email) REFERENCES users(email) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS company_problems (
                id VARCHAR(80) PRIMARY KEY,
                title VARCHAR(150) NOT NULL,
                description TEXT NOT NULL,
                company VARCHAR(150) NOT NULL,
                company_email VARCHAR(254) NOT NULL,
                skills VARCHAR(500) NOT NULL
            );
            CREATE TABLE IF NOT EXISTS applications (
                id INT PRIMARY KEY AUTO_INCREMENT,
                problem_id VARCHAR(80) NOT NULL,
                student_email VARCHAR(254) NOT NULL,
                student_name VARCHAR(100) NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_application (problem_id, student_email),
                FOREIGN KEY (problem_id) REFERENCES company_problems(id),
                FOREIGN KEY (student_email) REFERENCES users(email) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS practice_problems (
                id VARCHAR(80) PRIMARY KEY,
                title VARCHAR(150) NOT NULL,
                difficulty VARCHAR(30) NOT NULL,
                topic VARCHAR(80) NOT NULL,
                description TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS practice_attempts (
                id INT PRIMARY KEY AUTO_INCREMENT,
                problem_id VARCHAR(80) NOT NULL,
                student_email VARCHAR(254) NOT NULL,
                score INT NOT NULL,
                language VARCHAR(30) NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (problem_id) REFERENCES practice_problems(id),
                FOREIGN KEY (student_email) REFERENCES users(email) ON DELETE CASCADE
            );
            """
        )
        try:
            database.execute("ALTER TABLE users ADD COLUMN interests VARCHAR(2000) NOT NULL DEFAULT ''")
        except Exception as error:
            if "Duplicate column name" not in str(error):
                raise
        try:
            database.execute("ALTER TABLE users ADD COLUMN skills VARCHAR(2000) NOT NULL DEFAULT ''")
        except Exception as error:
            if "Duplicate column name" not in str(error):
                raise
        try:
            database.execute("ALTER TABLE users ADD COLUMN profile_photo MEDIUMTEXT NULL")
        except Exception as error:
            if "Duplicate column name" not in str(error):
                raise
        database.execute("DELETE FROM applications WHERE problem_id IN ('problem-1', 'problem-2')")
        database.execute("DELETE FROM company_problems WHERE id IN ('problem-1', 'problem-2')")
        database.executemany(
            "INSERT OR IGNORE INTO practice_problems VALUES (?, ?, ?, ?, ?)",
            [
                ("practice-1", "Two Sum", "Easy", "Arrays", "Find two indices whose values add up to a target."),
                ("practice-2", "Valid Parentheses", "Easy", "Stacks", "Determine whether brackets are correctly balanced."),
            ],
        )


