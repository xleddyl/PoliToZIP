document.addEventListener('DOMContentLoaded', async (event) => {
   const { blob, name } = await callServiceWorker('getZipBlob')
   if (blob && name) {
      const url = URL.createObjectURL(blob)
      chrome.downloads.onCreated.addListener(window.close())
      chrome.downloads.download({
         url: url,
         filename: `PoliToZIP-${name}.zip`,
      })
   }
})

/**
 * Call ServiceWorker in order to retrieve the generated ZIP
 */
function callServiceWorker(cmd, args) {
   return new Promise(async (resolve) => {
      const swr = navigator.serviceWorker
      swr.addEventListener('message', function onMessage(e) {
         swr.removeEventListener('message', onMessage)
         resolve({ blob: e.data.blob, name: e.data.name })
      })
      swr.ready.then((swr_ready) => swr_ready.active.postMessage({ cmd, args }))
   })
}
