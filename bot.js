import {setTimeout} from "node:timers/promises"
import { executablePath } from "puppeteer"
import puppeteer from "puppeteer-extra"
import StealthPlugin from "puppeteer-extra-plugin-stealth"
import locateChrome from "chrome-location"

puppeteer.use(StealthPlugin())

async function checkout(page) {
    await page.evaluate(() => {
        document.querySelector("a[data-locator-id='miniBag-checkout-select']").click()
    })
    await page.waitForSelector("#email")
    
    await page.evaluate(() => {
        let emailField = document.getElementById('email')
        simulateFormSubmission(emailField, "skibidi@gmail.com")
        let firstNameField = document.getElementById('TextField0')
        simulateFormSubmission(firstNameField, "Stefan")
        let lastNameField = document.getElementById('TextField1')
        simulateFormSubmission(lastNameField, "Nedelcu")
        let address1Field = document.getElementById('shipping-address1')
        simulateFormSubmission(address1Field, "Keble College")
        let address2Field = document.getElementById('TextField2')
        simulateFormSubmission(address2Field, "Parks Road")
        let cityField = document.getElementById('TextField3')
        simulateFormSubmission(cityField, "Oxford")
        let postcodeField = document.getElementById('TextField4')
        simulateFormSubmission(postcodeField, "OX1 3PG")
        let phoneField = document.getElementById('TextField5')
        simulateFormSubmission(phoneField, "07375950767")
        function simulateFormSubmission(field, fieldInput) {
            field.focus()
            field.value = fieldInput
            field.dispatchEvent(new KeyboardEvent('keydown', { key: 'y', bubbles: true }))
            field.dispatchEvent(new Event('input', { bubbles: true }))
            field.dispatchEvent(new Event('change', { bubbles: true }))
            field.blur()
        }
    })

    await setTimeout(1500)

    // fill in payment info and press pay now to finish
}

async function monitor(page) {
    //await page.goto("https://uk.gymshark.com/products/gymshark-onyx-5-0-seamless-long-sleeve-t-shirt-ls-tops-black-ss24")
    await page.goto("https://uk.gymshark.com/products/gymshark-onyx-5-0-seamless-tight-pants-black-aw24")
    await setTimeout(4000) // any shorter triggers a sign in :(

    await page.evaluate(() => {
        console.log("parsing")
        let links = document.querySelectorAll("a[class]") // list of all the links on page 
        // seems that links for choosing the colour start at index 5 always ... 
        //const blueLink = links[6]
        //const redLink = links[7]
        const redLink = links[5] // for testing purposes only -> REMOVE LATER

        // later will implement checking multiple in parallel but for now just the red one
        redLink.click()
    })

    // check for desired sizes: S and M
    await setTimeout(2000)
    let isAvailable = await page.evaluate(() => {
        console.log("Scraping sizes now")
        let labels = document.querySelectorAll("label[class]")
        console.log(labels)
        let sizesInStock = [] // list of labels for the sizes 
        let sizesInputs = [] // list of inputs corresponding to the sizes that are in stock 
        let available = false
        for (let i = 0; i < labels.length; i++) {
            const currentLabel = labels[i]
            if (currentLabel.classList.contains("size_size__4dJ_o")) {
                console.log(currentLabel)
                if (currentLabel.childNodes.length == 1) {
                    sizesInStock.push(currentLabel)
                    const inputID = currentLabel.htmlFor
                    sizesInputs.push(document.querySelectorAll(`input[id=${inputID}]`))
                }
            }
        }
        console.log(sizesInStock)
        console.log(sizesInputs)
        console.log("Number of sizes: ")
        console.log(sizesInStock.length)

        // then click input + update available flag and we are on our way 
        for (let i = 0; i < sizesInStock.length; i++) {
            const size = sizesInStock[i].innerText.toLowerCase()
            if (size == 's' || size == 'm') {
                available = true
                sizesInputs[i][0].click()
                break
            }
        }

        return available
    })

    await setTimeout(2000)

    if (isAvailable) {
        await page.evaluate(() => {
            document.querySelector("i[class='icon-tick']").click() // click add to bag
        })
        await setTimeout(2000)
        return true
    }
    return false
}

async function run() {
    console.log("hello world")
    const browser = await puppeteer.launch({ headless: false, executablePath: locateChrome})
    const page = await browser.newPage()

    while (true) {
        let isAvailable = await monitor(page)
        if (isAvailable) {
            await setTimeout(1000)
            await checkout(page)
            break
        } else {
            console.log("Product not available :(")
            await setTimeout(5000)
            break // remove this break normally so that it continually runs
        }
    }
}

run()