
var list

function onLoad() {
    list = document.getElementById('bin_list')

    console.log(list)

    socket.emit('page loaded')
}

const socket = io()
const id = socket.id
socket.on('connect', () => {
    console.log('socket connected')
})
socket.on('disconnect', () => {
    location.reload()
})

socket.on('update bins', bins => {
    console.log('bins:', bins)

    list.innerHTML = ''

    bins.forEach(e => {
        let li = document.createElement('p')
        li.innerHTML = Object.keys(e).reduce((p, key) => {
            return p + `${key}: ${e[key]}<br>`
        }, '')
        list.appendChild(li)
    })
})