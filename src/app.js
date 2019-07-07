import awsconfig from './aws-exports';
import chroma from 'chroma-js'

import Amplify, { API, graphqlOperation } from 'aws-amplify';
import * as queries from './graphql/queries';
import * as mutations from './graphql/mutations';
import * as subscriptions from './graphql/subscriptions';

Amplify.configure(awsconfig);

let _id = '';
let Color = {

};

function setupSubscription() {
    // Simple query
    // API.graphql(graphqlOperation(queries.listDevices))
    //     .then(data => data.data.listDevices.items.forEach(addToBody));

    // Query using a parameter
    // API.graphql(graphqlOperation(queries.getDevice, { id: 1 }))
    //     .then(console.log)
    // node.nextTick(() => console.log("Test"))

    const subscription = API.graphql(
        graphqlOperation(subscriptions.onUpdateDevice)
    ).subscribe({
        next: (updated) => {
            const obj = updated.value.data.onUpdateDevice;
            if (obj.id === _id) {
                console.log('received update', obj);
                processUpdate(obj)
            }
        }
    });
    window.createDevice = createDevice;
}

function addToBody(item) {
    const element = document.createElement('div');
    element.innerText = `${item.id}: ${item.seat}`;
    document.body.appendChild(element)

}

function processUpdate(obj) {
    console.log(JSON.parse(obj.data));
    Color.points = JSON.parse(obj.data).points
}

function P(time, color) {
    return {
        time,
        color
    }
}

function test(id=_id) {
    const now = Date.now();
    const obj = {
        points: []
    };
    //for (let i = 0; i < 10; i++) {
        obj.points.push(P(now, chroma("black")))
        obj.points.push(P(now + 1000, chroma("red")))
    //}
    API.graphql(graphqlOperation(mutations.updateDevice, {
        input: {
            id: id,
            data: JSON.stringify(obj)
        }
    }))
        .catch(console.error)
}

function testBlast(nextToken, startTime = Date.now()) {
    API.graphql(graphqlOperation(queries.listDevices, {nextToken}))
        .then(value => {
            value.data.listDevices.items.forEach(item => {
                console.log(item.id)
                cascade(item.id, startTime)
            });
            // console.log(value.data.listDevices.nextToken)
            if (value.data.listDevices.nextToken) {
                testBlast(value.data.listDevices.nextToken, startTime)
            }
        })
}

function cascade(id, now) {
    // const now = Date.now() + 5000;
    const obj = {
        points: []
    };
    for (let i = 0; i < 30; i++) {
        const x = id % 10;
        const y = Math.floor(id/10);
        const dist = Math.pow(x - 5, 2) + Math.pow(y - 5, 2);
        const ratio = 0.5 + 0.5 * Math.pow(Math.sin(2 * Math.PI * i / 6 + dist/200), 10)
        obj.points.push(P(now + i * 1000, chroma.mix('yellow', '#F90', ratio)))
    }
    API.graphql(graphqlOperation(mutations.updateDevice, {
        input: {
            id: id,
            data: JSON.stringify(obj)
        }
    }))
        .catch(console.error)
}

function updateCanvas() {
    const t = Date.now();

    if (Color.points) {
        for (let i = 0; i < Color.points.length; i++) {
            let p = Color.points[i];
            let p1 = i < Color.points.length - 1 ? Color.points[i + 1] : Color.points[i];
            if (p1.time < t) {
                // Past
                Color.points.shift();
                i--;
            } else if (t <= p1.time) {
                // Current
                const ratio = (t - p.time)/(p1.time - p.time);
                const current = chroma.mix(chroma(p.color._rgb), chroma(p1.color._rgb), ratio, 'hsl');
                Color.ctx.fillStyle = current.hex().toString();
                // console.log(chroma(p.color._rgb).hex(), chroma(p1.color._rgb).hex(), ratio)
                break;
            }
        }
    }

    Color.ctx.fillRect(0, 0, Color.W, Color.H)

}

function tick() {
    updateCanvas();

    window.requestAnimationFrame(tick)
}

function setupCanvas() {
    const canvas = document.createElement("canvas");
    const W = window.innerWidth;
    const H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    document.body.appendChild(canvas);
    Color = {canvas, ctx, W, H}
}

function init() {
    const key = window.location.search.split("id=")[1];
    window.test = test;
    window.stop = stop;
    window.testBlast = testBlast;
    window.Color = Color;
    if (!key) {
        console.log("No key specified");
        return
    }
    _id = key;
    setupCanvas();
    fetchUpdates(_id)
        .then(value => {
            if (!value.data.getDevice) {
                console.log('No data with this id, creating new Device');
                createDevice(_id, _id)
            }
            console.log(`Received data`, value);
            processUpdate(value.data.getDevice)
        })
        .catch(console.error);
    setupSubscription();
    window.requestAnimationFrame(tick);
}

function fetchUpdates(id) {
    return new Promise((resolve, reject) => {
        API.graphql(graphqlOperation(queries.getDevice, {id}))
            .then(resolve)
            .catch(reject)
    })
}

function createDevice(id, seat) {
    API.graphql(graphqlOperation(mutations.createDevice, {input: {id, seat}}))
        .then(console.log)

}

function stop(id=_id) {
    const now = Date.now();
    const obj = {
        points: []
    };
    //for (let i = 0; i < 10; i++) {
        obj.points.push(P(now, chroma("black")))
        obj.points.push(P(now + 1000, chroma("black")))
    //}
    API.graphql(graphqlOperation(mutations.updateDevice, {
        input: {
            id: id,
            data: JSON.stringify(obj)
        }
    }))
        .catch(console.error)
}

init();

