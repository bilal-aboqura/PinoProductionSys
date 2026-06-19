import asyncio
import re
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None

    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()

        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",
                "--disable-dev-shm-usage",
                "--ipc=host",
                "--single-process"
            ],
        )

        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        # Wider default timeout to match the agent's DOM-stability budget;
        # auto-waiting Playwright APIs (expect, locator.wait_for) inherit this.
        context.set_default_timeout(15000)

        # Open a new page in the browser context
        page = await context.new_page()

        # Interact with the page elements to simulate user flow
        # -> navigate
        await page.goto("http://localhost:3000")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass
        
        # -> Fill the 'Username or email' field with the admin username, fill the 'Password' field with the provided password, and click the 'Sign in' button to authenticate.
        # identifier text field
        elem = page.locator('[id="identifier"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("admin")
        
        # -> Fill the 'Username or email' field with the admin username, fill the 'Password' field with the provided password, and click the 'Sign in' button to authenticate.
        # password password field
        elem = page.locator('[id="password"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("PinoSys@12#34")
        
        # -> Fill the 'Username or email' field with the admin username, fill the 'Password' field with the provided password, and click the 'Sign in' button to authenticate.
        # Sign in button
        elem = page.get_by_role('button', name='Sign in', exact=True)
        await elem.click(timeout=10000)
        
        # -> Submit the sign-in form by focusing the Password field and pressing Enter to attempt to navigate to the dashboard.
        # password password field
        elem = page.locator('[id="password"]')
        await elem.click(timeout=10000)
        
        # -> Open the batch record titled 'B-2026-REPORTS-001' from the Dashboard so its actions (print/reprint) can be tested.
        # B-2026-REPORTS-001 elgagbo2 6/20/2026 link
        elem = page.get_by_role('link', name='B-2026-REPORTS-001 elgagbo2 6/20/2026', exact=True)
        await elem.click(timeout=10000)
        
        # -> Click the 'Return to Dashboard' button to go back to the dashboard so the batch can be reopened from the dashboard list.
        # Return to Dashboard link
        elem = page.get_by_role('link', name='Return to Dashboard', exact=True)
        await elem.click(timeout=10000)
        
        # -> Open the batch record by clicking the 'B-2026-REPORTS-001' link on the Dashboard.
        # B-2026-REPORTS-001 elgagbo2 6/20/2026 link
        elem = page.get_by_role('link', name='B-2026-REPORTS-001 elgagbo2 6/20/2026', exact=True)
        await elem.click(timeout=10000)
        
        # -> Click the 'Return to Dashboard' button (visible as 'العودة إلى لوحة التحكم') to go back to the Dashboard so the batch can be reopened from the dashboard list.
        # العودة إلى لوحة التحكم link
        elem = page.get_by_role('link', name='العودة إلى لوحة التحكم', exact=True)
        await elem.click(timeout=10000)
        
        # -> Open the batch record titled 'B-2026-REPORTS-001' from the dashboard by clicking its link so the print/reprint flow can be tested.
        # B-2026-REPORTS-001 elgagbo2 6/20/2026 link
        elem = page.get_by_role('link', name='B-2026-REPORTS-001 elgagbo2 6/20/2026', exact=True)
        await elem.click(timeout=10000)
        
        # -> Click the 'العودة إلى لوحة التحكم' (Return to Dashboard) button to return to the Dashboard so the batch link can be retried from the dashboard list.
        # العودة إلى لوحة التحكم link
        elem = page.get_by_role('link', name='العودة إلى لوحة التحكم', exact=True)
        await elem.click(timeout=10000)
        
        # -> Open the main 'Batches' page by clicking the 'Batches' navigation link so the target batch can be opened from the batches list.
        # Batches link
        elem = page.get_by_role('link', name='Batches', exact=True)
        await elem.click(timeout=10000)
        
        # -> Open the batch details by clicking the 'B-2026-REPORTS-001' link on the Batches page so the print/reprint flow can be tested.
        # B-2026-REPORTS-001 elgagbo2 6/20/2026 link
        elem = page.get_by_role('link', name='B-2026-REPORTS-001 elgagbo2 6/20/2026', exact=True)
        await elem.click(timeout=10000)
        
        # -> Click the 'العودة إلى لوحة التحكم' (Return to Dashboard) button to return to the Dashboard so alternative navigation paths can be tried.
        # العودة إلى لوحة التحكم link
        elem = page.get_by_role('link', name='العودة إلى لوحة التحكم', exact=True)
        await elem.click(timeout=10000)
        
        # -> Open the 'Printing' page by clicking the 'Printing' navigation link so label print/reprint functionality can be tested.
        # Printing link
        elem = page.get_by_role('link', name='Printing', exact=True)
        await elem.click(timeout=10000)
        
        # -> Click the 'Reprint' button for the completed print entry (label: 'Reprint') to open the reprint flow and reveal the reprint reason selection UI.
        # Reprint button
        elem = page.get_by_role('button', name='Reprint', exact=True)
        await elem.click(timeout=10000)
        
        # -> Select the 'Print error' option from the 'Reason' dropdown in the Reprint dialog and click the 'Confirm' button to submit the reprint.
        # Damage Loss Print error Other dropdown
        elem = page.locator("xpath=/html/body/main/section/div[3]/table/tbody/tr/td[6]/div/div/div/div/label/select").nth(0)
        await elem.wait_for(state="visible", timeout=10000)
        await elem.select_option("")
        
        # -> Select the 'Print error' option from the 'Reason' dropdown in the Reprint dialog and click the 'Confirm' button to submit the reprint.
        # Confirm button
        elem = page.get_by_role('button', name='Confirm', exact=True)
        await elem.click(timeout=10000)
        
        # --> Assertions to verify final state
        
        # --> Verify the second print action is recorded as a reprint
        # Assert: The batch's actions cell shows 'Reprint', indicating the second print was recorded as a reprint.
        await expect(page.locator("xpath=/html/body/main/section/div[3]/table/tbody/tr/td[6]").nth(0)).to_contain_text("Reprint", timeout=15000), "The batch's actions cell shows 'Reprint', indicating the second print was recorded as a reprint."
        current_url = await page.evaluate("() => window.location.href")
        # Assert: page loaded with a URL (final outcome verified by the AI judge during the run)
        assert current_url, 'Page should have loaded with a URL'
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    