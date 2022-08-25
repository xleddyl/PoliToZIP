let PB = undefined
let TOTAL_SIZE = 0
let DOWNLOADING = false

document.addEventListener('DOMContentLoaded', async (event) => {
   const item_container = await waitForItemContainer()
   addDownloadButtonToCourse()
   addDownloadButtonToFolders(item_container)
   addGreetings(item_container)
})

/**
 * Listen for messages sent by ./service_worker.js and update the UI
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
   switch (request.type) {
      case 'perc': {
         if (PB) {
            PB.stop()
            const progress = (request.data / 1e6).toFixed(1)
            PB.setText(`DOWNLOADING ... ${progress}/${TOTAL_SIZE}MB`)
            PB.set(progress / TOTAL_SIZE)
         }
         break
      }
      case 'fetch': {
         if (PB) {
            PB.setText(`FETCHING FILES ... ${(request.data / 1e6).toFixed(1)}MB`)
         }
         break
      }
      case 'zip': {
         if (PB) {
            PB.setText(`ZIPPING FILES ...`)
         }
         break
      }
      case 'size': {
         TOTAL_SIZE = (request.data / 1e6).toFixed(1)
         break
      }
   }
})

/**
 * Wait for file explorer to be ready
 */
function waitForItemContainer() {
   return new Promise((resolve, reject) => {
      if (document.querySelector('.file-item')) {
         return resolve(document.querySelector('.file-item'))
      }

      const observer = new MutationObserver((mutations) => {
         if (document.querySelector('.file-item')) {
            resolve(document.querySelector('.file-item'))
            observer.disconnect()
         }
      })

      observer.observe(document.body, {
         childList: true,
         subtree: true,
      })
   })
}

/**
 * Add the button for downloading the whole course
 */
function addDownloadButtonToCourse() {
   const header = document.querySelector('.RegionBorderMao h2')
   const download = document.createElement('div')

   header.style.display = 'flex'
   download.style.marginRight = '10px'
   download.innerHTML = `
      <a ng-show="item.model.type === 'file'" href="javascript:void(0)" class="">
         <i class="glyphicon glyphicon-save"></i>
      </a>`
   download.addEventListener('click', (event) => {
      onDownloadButtonClicked('', header.querySelector('strong').innerText)
   })
   header.prepend(download)
}

/**
 * Add the buttons for downloading single folders
 */
function addDownloadButtonToFolders(item_container) {
   const observer = new MutationObserver((mutations) => {
      const elements = item_container.getElementsByTagName('tr')
      Array.from(elements)
         .filter((element) => {
            return element ? !Object.values(element.classList).includes('item-list') : false
         })
         .forEach((element) => {
            if (
               element.querySelector('.item-list a i') &&
               !Object.values(element.querySelector('.item-list a i').classList).includes('ng-hide')
            ) {
               var code = element.querySelector('td a').href.split('/')[5].replace('?download', '')
               element.querySelector('td a').href = 'javascript:void(0)'
               element.querySelector('td a').classList = []
               element.querySelector('td').addEventListener('click', (event) => {
                  onDownloadButtonClicked(code, element.querySelector('span').textContent)
               })
            }
         })
   })

   observer.observe(item_container, {
      childList: true,
   })
}

/**
 * Add a greeting element below the file explorer
 */
function addGreetings(item_container) {
   const greetings = document.createElement('tr')
   greetings.setAttribute('ng-repeat', 'item')
   greetings.classList = ['ng-scope']
   greetings.innerHTML = `
      <td style="text-align:center;">
         <i class="glyphicon glyphicon-info-sign"></i>
      </td>
      <td class="item-list">
         <span class="ng-binding" style="font-style:italic">
            Contribute to PoliToZIP on <a href="https://Github.com/xleddyl/PoliToZIP" target=”_blank”>Github</a> :)
         </span>
      </td>
      <td class="hidden-xs"></td>
      <td class="hidden-sm hidden-xs ng-binding"></td>`
   item_container.appendChild(greetings)

   console.log(
      `PTZ -> PoliToZIP enabled! Leave a star on Github https://Github.com/xleddyl/PoliToZIP :)`
   )
}

/**
 * send a message to ./service_worker.js to start downloading the folder
 */
async function onDownloadButtonClicked(dirCode, dirName) {
   if (!DOWNLOADING) {
      DOWNLOADING = true
      if (PB) {
         PB.destroy()
         document.querySelector('.pb-text-wrapper').remove()
      }
      PB = new ProgressBar.Line('#filemanagerNavbar', {
         color: '#fc7a08',
         strokeWidth: 1.3,
         trailColor: '#f5f5f5',
         trailWidth: 1.3,
         duration: 50,
         svgStyle: {
            display: 'block',
            borderRadius: '10px',
            margin: '15px 10px 0 10px',
         },
         text: {
            value: `FETCHING FILES ...`,
            style: {
               position: 'relative',
               fontWeight: 'bold',
               color: 'black',
               textAlign: 'center',
               margin: '5px 0 15px 0',
            },
         },
      })
      const wrapper = document.createElement('div')
      const spinner = document.createElement('div')
      const abort = document.createElement('div')
      wrapper.classList = 'pb-text-wrapper'
      spinner.classList = 'progressbar-spinner'
      abort.classList = 'abort-download'
      abort.innerHTML = 'X'
      abort.onclick = () => chrome.runtime.sendMessage({type: 'abortDownload'})
      wrapper.appendChild(spinner)
      wrapper.appendChild(PB._container.querySelector('.progressbar-text'))
      wrapper.appendChild(abort)
      PB._container.appendChild(wrapper)

      document.querySelector('.progressbar-spinner').classList.add('active')
      document.querySelector('.abort-download').classList.add('active')
      chrome.runtime.sendMessage({type: 'zip', data: { dirCode, dirName }}, function (response) {
         document.querySelector('.progressbar-spinner').classList.remove('active')
         document.querySelector('.abort-download').classList.remove('active')
         if (response) {
            const data = response.data
            if(typeof(data.msg) === 'string') {
               data.ok ? (PB.text.style.color = 'green') : (PB.text.style.color = 'red')
               PB.setText(data.msg)
            } else {
               PB.text.style.color = 'red'
               PB.setText('DOWNLOAD ABORTED')
            }
         }
         DOWNLOADING = false
      })
   } else {
      window.alert(
         'Another download is still in progress, please wait for it to finish.'
      )
   }
}
