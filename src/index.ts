import { activate } from './animate'
import { createCanvas } from './canvas'

const run = async () => {
    activate(await createCanvas())
}

if (document.readyState === "complete") {
    run();
} else {
    window.addEventListener('DOMContentLoaded', run);
}
