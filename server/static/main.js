
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
            center: ol.proj.fromLonLat([150.9335167, -33.7348637]),
            zoom: 18.5
        })
    });
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

    bins.forEach(bin => {
        let li = document.createElement('p')
        li.innerHTML = Object.keys(bin).reduce((p, key) => {
            return p + `${key}: ${bin[key]}<br>`
        }, '')
        list.appendChild(li)
    })



    binPopups.slice().forEach(e => {e.remove()});

    bins.forEach(bin => {
        new BinPopup([parseFloat(bin.Longitude), parseFloat(bin.Lattitude)], parseFloat(bin.Depth));
    });
})




const binPopups = [];
class BinPopup {
    constructor(lat_long, depth) {

        // a function that should encompass any depth of bin
        let progress = Math.E**(-depth/50);

        this.element = document.createElement("div");
        this.element.innerHTML = `
<div style="background-color: rgb(40, 40, 40); width: 40px; height: 15px;" class="bin_marker">
        <div style="background-color: rgb(${ 255 * Math.min(2*progress, 1) }, ${ 255 * Math.min(-2*progress+2, 1) }, 0); height: 100%; width: ${progress * 100}%;"></div>
</div>
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
