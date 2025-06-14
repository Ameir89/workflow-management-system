import bcrypt

password = "admin123!"
hashed = "$2b$12$Ppyp.CEXX0GttnrEz733Z.asnCsG6RUg11DNaJ5hSJh57eJjWYQXO"

# Test the verification
result = bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
print(f"Password verification: {result}")