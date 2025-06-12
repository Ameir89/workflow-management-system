import bcrypt

password = "admin123!"
hashed = "$2b$12$IiFAwV8i/cRpvOq0dqEB1OadexFCUEnOzITnDPOwVrTiDbnJxhqnG"

# Test the verification
result = bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
print(f"Password verification: {result}")