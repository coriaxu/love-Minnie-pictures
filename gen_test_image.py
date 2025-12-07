from PIL import Image, ImageDraw, ImageFont
import os

def create_test_image():
    # Create distinct color image
    img = Image.new('RGB', (2000, 1500), color = '#ffcc00') # Sunflower yellow
    d = ImageDraw.Draw(img)
    
    # Draw huge text
    try:
        # Try to load a default font, otherwise default to bitmap
        font = ImageFont.truetype("Arial.ttf", 100)
    except:
        font = ImageFont.load_default()
        
    d.text((100,100), "Hello Minnie!", fill=(27, 39, 69), font=font)
    d.text((100,300), "2025-12-06", fill=(27, 39, 69), font=font)
    
    # Save to raw_images
    if not os.path.exists('raw_images'):
        os.makedirs('raw_images')
        
    img.save('raw_images/20251206_test.jpg')
    print("Created raw_images/20251206_test.jpg")

if __name__ == "__main__":
    create_test_image()
