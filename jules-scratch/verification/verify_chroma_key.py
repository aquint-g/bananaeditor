import asyncio
from playwright.async_api import async_playwright, expect

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        try:
            # 1. Go to the application
            await page.goto("http://127.0.0.1:5000")

            # 2. Upload an image
            async with page.expect_file_chooser() as fc_info:
                await page.locator("label[for='asset-upload']").click()
            file_chooser = await fc_info.value
            await file_chooser.set_files("jules-scratch/verification/test_image.png")

            # 3. Wait for the asset to appear and drag it to the canvas
            asset_thumbnail = page.locator(".asset-thumbnail").first
            await expect(asset_thumbnail).to_be_visible()

            canvas = page.locator("#canvas")
            await asset_thumbnail.drag_to(canvas)

            # 4. Right-click the newly added canvas item
            canvas_item = page.locator(".canvas-item-wrapper").first
            await expect(canvas_item).to_be_visible()
            await canvas_item.click(button="right")

            # 5. Click the "Remove Background" option
            await page.locator("#context-remove-background").click()

            # 6. Wait for the background removal to complete
            await expect(canvas_item).to_have_class(
                "canvas-item-wrapper selected loading-background"
            )
            # Increase timeout to account for the model call
            await expect(canvas_item).not_to_have_class(
                "canvas-item-wrapper selected loading-background", timeout=30000
            )
            # Also wait for the chroma-key attribute to be set
            await expect(canvas_item).to_have_attribute("data-chroma-key", "true")

            # 7. Take a screenshot for visual verification
            await page.screenshot(path="jules-scratch/verification/chroma_key_verification.png")

        except Exception as e:
            print(f"An error occurred during verification: {e}")
            await page.screenshot(path="jules-scratch/verification/error.png")

        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(main())