
var list

var map

function onLoad() {
    list = document.getElementById('bin_list')

    console.log(list)

    socket.emit('page loaded')


    map = new ol.Map({
        target: 'map',
        layers: [
            new ol.layer.Tile({
            source: new ol.source.OSM()
            })
        ],
        view: new ol.View({
            center: ol.proj.fromLonLat([37.41, 8.82]),
            zoom: 4
        })
    });

    new BinPopup([37.41, 8.82]);
    new BinPopup([0.0, 0.0]);
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



    binPopups.slice().forEach(e => {e.remove()});

    bins.forEach(bin => {
        new BinPopup([150.9335167, -33.7348637]);
    });
})




const binPopups = [];
class BinPopup {
    constructor(lat_long) {
        this.element = document.createElement("div");
        this.element.innerHTML = `
<p style="background-color: blue;">hello world</p>
<div
        `;

        this.overlay = new ol.Overlay({
            element: this.element
        });
        this.overlay.setPosition(ol.proj.fromLonLat(lat_long));
        map.addOverlay(this.overlay);

        binPopups.push(this);
    }

    remove() {
        map.removeOverlay(this.overlay);
        binPopups.splice(binPopups.indexOf(this), 1);
    }
}
