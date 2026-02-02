from PIL import Image, ImageDraw
import sys

def remove_background(input_path, output_path):
    print(f"Processing {input_path}...")
    img = Image.open(input_path).convert("RGBA")
    width, height = img.size
    pixels = img.load()
    
    # Grid of visited pixels
    visited = set()
    queue = []
    
    # Start from corners
    corners = [(0, 0), (width-1, 0), (0, height-1), (width-1, height-1)]
    for x, y in corners:
        queue.append((x, y))
        visited.add((x, y))
        
    # Heuristic: Background is low saturation (white/grey)
    # Heart is Green (High Saturation)
    # Highlights are White (Low Saturation) but not connected to border (hopefully)
    
    def is_background_candidate(r, g, b):
        # Calculate Saturation approximately
        cmax = max(r, g, b)
        cmin = min(r, g, b)
        delta = cmax - cmin
        
        # High brightness?
        if cmax < 50: return False # Too dark, probably edge of heart? Background is usually bright.
        
        # Low saturation? (White or Grey)
        # If delta is small relative to cmax, saturation is low.
        if cmax > 0:
            sat = delta / cmax
        else:
            sat = 0
            
        return sat < 0.25 and cmax > 150 # White/Grey checks

    while queue:
        x, y = queue.pop(0)
        
        # Make transparent
        r, g, b, a = pixels[x, y]
        pixels[x, y] = (r, g, b, 0)
        
        # Check neighbors
        for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nx, ny = x + dx, y + dy
            
            if 0 <= nx < width and 0 <= ny < height:
                if (nx, ny) not in visited:
                    nr, ng, nb, na = pixels[nx, ny]
                    if is_background_candidate(nr, ng, nb):
                        visited.add((nx, ny))
                        queue.append((nx, ny))

    img.save(output_path)
    print(f"Saved transparent logo to {output_path}")

if __name__ == "__main__":
    remove_background(
        "/home/rkm/Desktop/project/proj_new/local_img/Gemini_Generated_Image_jolgwrjolgwrjolg.png",
        "/home/rkm/Desktop/project/proj_new/public/logo_final.png"
    )
