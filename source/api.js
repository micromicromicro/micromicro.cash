import {basePath} from './_shared.js'
Array.prototype.forEach.call(document.getElementsByClassName('endpointprefix'), e => e.innerHTML = basePath)
