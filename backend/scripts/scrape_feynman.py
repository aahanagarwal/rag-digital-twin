import os
import time
import cloudscraper
from bs4 import BeautifulSoup

def scrape_feynman():
    output_dir = os.path.join(os.path.dirname(__file__), "..", "data", "science")
    os.makedirs(output_dir, exist_ok=True)
    
    volumes = {"I": 52, "II": 42} # Number of chapters per volume
    
    # Create a cloudscraper instance to bypass Cloudflare bot protection
    scraper = cloudscraper.create_scraper(browser={
        'browser': 'chrome',
        'platform': 'windows',
        'desktop': True
    })
    
    for vol, max_ch in volumes.items():
        for ch in range(1, max_ch + 1):
            url = f"https://www.feynmanlectures.caltech.edu/{vol}_{ch:02d}.html"
            print(f"Fetching {url}")
            
            try:
                # Use scraper instead of standard requests
                r = scraper.get(url, timeout=15)
                
                if r.status_code == 404:
                    print(f"Not found: {url}")
                    continue
                    
                # We use BeautifulSoup to strip all the raw HTML tags (like <div>, <script>)
                # so that your Pinecone database only gets the actual readable English text!
                soup = BeautifulSoup(r.text, 'html.parser')
                chapter_text = soup.get_text(separator='\n', strip=True)
                    
                filename = os.path.join(output_dir, f"Vol{vol}_Ch{ch:02d}.txt")
                with open(filename, 'w', encoding='utf-8') as f:
                    f.write(chapter_text)
                print(f"Saved {filename}")
                    
                time.sleep(1)
                    
            except Exception as e:
                print(f"Error fetching {url}: {e}")

if __name__ == "__main__":
    scrape_feynman()
