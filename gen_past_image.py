from PIL import Image, ImageDraw, ImageFont
import os

def create_past_image():
    # Create distinct color image (Van Gogh Blue-ish)
    img = Image.new('RGB', (1600, 1200), color = '#1b2745') 
    d = ImageDraw.Draw(img)
    
    try:
        font = ImageFont.truetype("Arial.ttf", 80)
    except:
        font = ImageFont.load_default()
        
    d.text((100,100), "Memory of Yesterday", fill='#ffcc00', font=font)
    d.text((100,250), "2025-12-05", fill='#ffcc00', font=font)
    d.ellipse([400, 400, 600, 600], outline='#ffcc00', width=10)
    
    if not os.path.exists('raw_images'):
        os.makedirs('raw_images')
        
    img.save('raw_images/20251205_past.jpg')
    print("Created raw_images/20251205_past.jpg")

if __name__ == "__main__":
    create_past_image()
