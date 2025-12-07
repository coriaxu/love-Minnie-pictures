from PIL import Image
import os

def process_image(input_path, output_path):
    img = Image.open(input_path).convert("RGBA")
    
    # Make white background transparent
    datas = img.getdata()
    new_data = []
    for item in datas:
        # Change all white (also shades of whites) to transparent
        if item[0] > 240 and item[1] > 240 and item[2] > 240:
            new_data.append((255, 255, 255, 0))
        else:
            new_data.append(item)
    
    img.putdata(new_data)
    
    # Resize to icon size (e.g., 128x128 for good quality on retina)
    img = img.resize((128, 128), Image.Resampling.LANCZOS)
    
    # Ensure output directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    img.save(output_path, "PNG")
    print(f"Saved processed icon to {output_path}")

input_path = "/Users/surfin/.gemini/antigravity/brain/291e22f4-c12c-499c-a052-7d29a0728787/aesthetic_sunflower_icon_1765082647277.png"
output_path = "/Users/surfin/love Minnie 图片库项目/images/sunflower_icon.png"

process_image(input_path, output_path)
