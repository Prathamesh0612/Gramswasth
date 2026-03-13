import os
from dotenv import load_dotenv

load_dotenv()

print("CLOUD NAME:", os.environ.get('CLOUDINARY_CLOUD_NAME'))
print("API KEY:", bool(os.environ.get('CLOUDINARY_API_KEY')))
print("API SECRET:", bool(os.environ.get('CLOUDINARY_API_SECRET')))

import cloudinary
cloudinary.config(
    cloud_name=os.environ.get("CLOUDINARY_CLOUD_NAME"),
    api_key=os.environ.get("CLOUDINARY_API_KEY"),
    api_secret=os.environ.get("CLOUDINARY_API_SECRET")
)

try:
    with open("dummy.txt", "w") as f:
        f.write("hello")
    import cloudinary.uploader
    res = cloudinary.uploader.upload("dummy.txt", resource_type="raw")
    print("SUCCESS:", res)
except Exception as e:
    print("ERROR:", e)
