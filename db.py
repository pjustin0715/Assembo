import os
import pymongo
from dotenv import load_dotenv

load_dotenv()

cluster = pymongo.MongoClient(os.getenv("MONGODB_URI"))
db = cluster["assembo"]


builds_collection = db["builds"]

case_collection = db["cases"]
cooler_collection = db["coolers"]
cpu_collection = db["cpus"]
gpu_collection = db["gpus"]
motherboard_collection = db["motherboards"]
psu_collection = db["psus"]
ram_collection = db["ram"]
storage_collection = db["storages"]

components = (case_collection,cooler_collection,cpu_collection,gpu_collection,motherboard_collection,psu_collection,ram_collection,storage_collection)

for component in components:
    component_collection = component.find()
    for component_attr in component_collection:
        print(component_attr)