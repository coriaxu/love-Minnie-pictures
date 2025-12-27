#!/usr/bin/env python3
"""
图片智能补边工具
把原图完整保留在中间，用模糊放大版填充边缘，输出标准 16:9 或 9:16

用法:
    python pad_image.py input.jpg output.jpg --ratio 16:9
    python pad_image.py input.jpg output.jpg --ratio 9:16
    python pad_image.py input.jpg output.jpg  # 自动检测并输出同向最近标准比例
"""

import argparse
from pathlib import Path
from PIL import Image, ImageFilter

def calculate_target_size(orig_width, orig_height, target_ratio):
    """
    计算目标尺寸：保持原图完整，扩展到目标比例
    target_ratio: 宽/高 比值
    """
    orig_ratio = orig_width / orig_height
    
    if orig_ratio > target_ratio:
        # 原图更宽，需要上下补边
        new_width = orig_width
        new_height = int(orig_width / target_ratio)
    else:
        # 原图更高，需要左右补边
        new_height = orig_height
        new_width = int(orig_height * target_ratio)
    
    return new_width, new_height

def pad_image_with_blur(input_path, output_path, target_ratio_str=None):
    """
    将图片补边到目标比例，用模糊放大版填充边缘
    """
    # 打开图片
    img = Image.open(input_path)
    orig_width, orig_height = img.size
    orig_ratio = orig_width / orig_height
    
    # 确定目标比例
    if target_ratio_str:
        w, h = map(int, target_ratio_str.split(':'))
        target_ratio = w / h
    else:
        # 自动检测：横图用16:9，竖图用9:16
        if orig_ratio >= 1:
            target_ratio = 16 / 9
            target_ratio_str = "16:9"
        else:
            target_ratio = 9 / 16
            target_ratio_str = "9:16"
    
    # 检查是否已经是目标比例（允许 1% 误差）
    if abs(orig_ratio - target_ratio) / target_ratio < 0.01:
        print(f"✓ 图片已经是 {target_ratio_str} 比例，无需处理")
        img.save(output_path, quality=95)
        return
    
    # 计算目标尺寸
    new_width, new_height = calculate_target_size(orig_width, orig_height, target_ratio)
    
    # 创建模糊背景（放大原图并模糊）
    bg_img = img.resize((new_width, new_height), Image.LANCZOS)
    bg_img = bg_img.filter(ImageFilter.GaussianBlur(radius=30))
    
    # 稍微调暗背景，让主图更突出
    from PIL import ImageEnhance
    enhancer = ImageEnhance.Brightness(bg_img)
    bg_img = enhancer.enhance(0.6)
    
    # 计算原图放置位置（居中）
    paste_x = (new_width - orig_width) // 2
    paste_y = (new_height - orig_height) // 2
    
    # 把原图贴到模糊背景上
    bg_img.paste(img, (paste_x, paste_y))
    
    # 保存
    output_path = Path(output_path)
    if output_path.suffix.lower() in ['.jpg', '.jpeg']:
        bg_img.save(output_path, quality=95)
    elif output_path.suffix.lower() == '.webp':
        bg_img.save(output_path, quality=95)
    else:
        bg_img.save(output_path)
    
    print(f"✓ 处理完成: {orig_width}x{orig_height} → {new_width}x{new_height} ({target_ratio_str})")
    print(f"  输出: {output_path}")

def main():
    parser = argparse.ArgumentParser(description='图片智能补边工具')
    parser.add_argument('input', help='输入图片路径')
    parser.add_argument('output', help='输出图片路径')
    parser.add_argument('--ratio', '-r', default=None, 
                        help='目标比例，如 16:9 或 9:16（默认自动检测）')
    
    args = parser.parse_args()
    pad_image_with_blur(args.input, args.output, args.ratio)

if __name__ == '__main__':
    main()
