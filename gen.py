import bcrypt

password = "admin123!"

# Generate salt and hash the password
hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

print(f"Original password: {password}")
print(f"Hashed password: {hashed.decode('utf-8')}")