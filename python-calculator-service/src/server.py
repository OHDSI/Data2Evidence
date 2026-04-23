import random
from datetime import datetime
from fastapi import FastAPI

app = FastAPI()


@app.get("/python-calculator")
def root():
    print("GET /python-calculator - Base route called")
    return {"message": "Python Calculator route"}


@app.get("/python-calculator/add")
def add():
    print("GET /python-calculator/add - Add endpoint called")
    num1 = random.randint(0, 99)
    num2 = random.randint(0, 99)
    result = num1 + num2
    print(f"Calculation: {num1} + {num2} = {result}")
    return {"num1": num1, "num2": num2, "result": result}


@app.get("/python-calculator/health")
def health():
    print("GET /python-calculator/health - Health check called")
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}