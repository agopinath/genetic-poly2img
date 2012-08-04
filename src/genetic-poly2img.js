/**
 * genetic-poly2img - a genetic programming implementation
 *
 * Copyright (c) 2012 Ajay Gopinath
 *
 * This program is free software; you can redistribute it and/or modify it under the
 * terms of the GNU Lesser General Public License as published by the Free Software
 * Foundation; either version 2.1 of the License, or (at your option) any later
 * version.
 *
 * genetic-poly2img is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A
 * PARTICULAR PURPOSE. See the GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License along
 * with genetic-poly2img; if not, see <http://www.gnu.org/licenses/>.
 * 
 * @author: Ajay Gopinath <ajgopi124(at)gmail(dot)com>
 */

//--------------V 1.0---------------//

var img = new Image();
img.src = "../assets/chrome-logo.png"; //"../assets/chrome-logo-large.png"; //"../assets/chrome-logo-small.png"; //"../assets/mona-lisa.jpg"; 

var IMAGE_HEIGHT = 0;
var IMAGE_WIDTH = 0;

var CANVAS_IMG = null;
var CANVAS_BEST = null;
var CANVAS_REALTIME = null;

var ctxImg = null;
var ctxBest = null;
var ctxRlt = null;
	
var ORIG_DATA = null;
var ORIG_PIXELS = null;

var LOG_WINDOW = null;

var CURR_ORGANISMS = null;

var	BEST_FITNESS = 0.0;
var GENERATION_COUNT = 0;
var ORGANISM_INDEX = 0;
var ORGANISMS_PER_GENERATION = 100;

var MUTATION_COUNT = 0;
var MUTATION_LEVEL = "medium";

var EVOLVE_INTERVAL_ID = null;
var IS_EVOLVING = false;

var MILLI_COUNT = 0;
var SECOND_COUNT = 0;
var SAMPLE_RATE = 1;

// INITIALIZATION FUNCTIONS
function initCanvases() {
	CANVAS_IMG = document.getElementById('canvas_img');
	CANVAS_BEST = document.getElementById('canvas_best');
	CANVAS_REALTIME = document.getElementById('canvas_realtime');
	
	ctxImg = CANVAS_IMG.getContext('2d');
	ctxBest = CANVAS_BEST.getContext('2d');
	ctxRlt = CANVAS_REALTIME.getContext('2d');
}

function initImage() {
	clearCanvas(ctxImg);
	clearCanvas(ctxBest);
	clearCanvas(ctxRlt);

	IMAGE_WIDTH = img.width;
	IMAGE_HEIGHT = img.height;
	
	CANVAS_IMG.setAttribute('width', IMAGE_WIDTH);
	CANVAS_IMG.setAttribute('height', IMAGE_HEIGHT);

	CANVAS_BEST.setAttribute('width', IMAGE_WIDTH);
	CANVAS_BEST.setAttribute('height', IMAGE_HEIGHT);

	CANVAS_REALTIME.setAttribute('width', IMAGE_WIDTH);
	CANVAS_REALTIME.setAttribute('height', IMAGE_HEIGHT);

	ctxImg.drawImage(img, 0, 0);

	ORIG_DATA = ctxImg.getImageData(0, 0, IMAGE_WIDTH, IMAGE_HEIGHT);
	ORIG_PIXELS = new Uint32Array(ORIG_DATA.data.length);
	ORIG_PIXELS.set(ORIG_DATA.data);
}

function initOrganisms() {
	CURR_ORGANISMS = [];
	
	for (var i = ORGANISMS_PER_GENERATION - 1; i >= 0; i--) {
		CURR_ORGANISMS[i] = new Organism();
		CURR_ORGANISMS[i].initializeRandomGenome();
	}
}

function initOtherStuff() {
	BEST_FITNESS = 0.0;  // fitness ranges between 0.0 and 1.0. higher values indicate a higher fitness. initialized to the least fit value, and should decrease with evolution
	MUTATION_LEVEL = "medium";
	
	MUTATION_COUNT = 0;
	GENERATION_COUNT = 0;
	ORGANISM_INDEX = 0;
	SECOND_COUNT = 0;
}

function init() {
	LOG_WINDOW = document.getElementById("logWindow");
	raw("\nNUMBER OF POLYGONS USED: "+ Organism.NUM_CHROMOSOMES);
	raw("NUMBER OF VERTICES PER POLYGON: "+ Chromosome.NUM_VERTICES);
	initCanvases();
	initImage();
	initOrganisms();
	initOtherStuff();
}

function startEvolution() {
	IS_EVOLVING = true;
	debug("starting evolution");
	EVOLVE_INTERVAL_ID = setInterval("evolveOrganisms();", 0);
}

function pauseEvolution() {
	IS_EVOLVING = false;	
	debug("pausing evolution");
	printStats();
	clearInterval(EVOLVE_INTERVAL_ID);
}

// ALGORITHM CORE FUNCTIONS
function evolveOrganisms() {
	var currentOrganism = CURR_ORGANISMS[ORGANISM_INDEX];
		
	drawOrganism(currentOrganism, ctxRlt);
	calculateAndSetFitness(currentOrganism);
		
	if(currentOrganism.normFitness > BEST_FITNESS) {
		BEST_FITNESS = currentOrganism.normFitness;
		drawOrganism(currentOrganism, ctxBest);
	}
	
	if(ORGANISM_INDEX == ORGANISMS_PER_GENERATION - 1) { 
		
		ORGANISM_INDEX = 0;
		
		CURR_ORGANISMS = createNewGeneration(CURR_ORGANISMS);
	
		if(BEST_FITNESS >= 0.98) {
			debug("!!reached optimum fitness");
			alert("!!reached optimum fitness");
			pauseEvolution();
		}
		
		GENERATION_COUNT++;
		
		return;
	}
	
	if(MILLI_COUNT === 1000) {
		MILLI_COUNT = 0;
		SECOND_COUNT++;
	}
		
	MILLI_COUNT++;
	ORGANISM_INDEX++;
}

function createNewGeneration(oldGeneration) {
	var parents = null;
	var children = [];
	var currTotalFitness = 0;
	
	for (var i = 0, l = ORGANISMS_PER_GENERATION; i < l; i++) {
		currTotalFitness += oldGeneration[i].fitness;
	}
	
	for (var i = 0, l = ORGANISMS_PER_GENERATION; i < l; i+=2) {
		parents = rouletteSelect(oldGeneration, currTotalFitness);
		
		if(Organism.isToCrossover())
			Organism.doCrossover(parents[0], parents[1]);
		
		if(Organism.isToMutate())
			parents[0].mutate(MUTATION_LEVEL);
			
		if(Organism.isToMutate())
			parents[1].mutate(MUTATION_LEVEL);
			
		children[i] = parents[0];
		children[i+1] = parents[1];
	}
	
	return children;
}

function rouletteSelect(competitors, totalFitnessSeed) {
	var parents = [];
	var roulette_mark;
	var tempTotalFitness;
	
	while(parents.length < 2) {
		tempTotalFitness = 0;
		roulette_mark = randInt(totalFitnessSeed);
		
		for (var i = 0, l = ORGANISMS_PER_GENERATION; i < l; i++) {
			tempTotalFitness += competitors[i].fitness;
			
			if(tempTotalFitness > roulette_mark)
				parents.push(competitors[i]);
		}
	}
	
	return parents;
}

function calculateAndSetFitness(organism) {
	var ORIG_PIXELS_CACHE = ORIG_PIXELS; // declaring 
	var draftData = ctxRlt.getImageData(0, 0, IMAGE_WIDTH, IMAGE_HEIGHT);
	var draftPixels = new Uint32Array(draftData.data.length);
	draftPixels.set(draftData.data);
	
	var RANGE_MAX = (256 * 4) * ((IMAGE_HEIGHT * IMAGE_WIDTH)/SAMPLE_RATE); // upper bound of difference between the current organism and the original organism (image) -- when the organisms are exactly different
	var RANGE_MIN = 0; // lower bound of difference between the current organism and the original organism (image) -- when the organisms are exactly the same
	
	var total_difference = 0; // total difference of all corresponding pixels between original organism and current organism
	
	for(var a = 0, b = draftPixels.length; a < b; a+=SAMPLE_RATE) {
       total_difference += Math.abs(draftPixels[a] - ORIG_PIXELS_CACHE[a]);    // difference in RGBA components of the current pixel
	};
		
	var total_fitness = (RANGE_MAX-total_difference);
	
	organism.fitness = total_fitness;
	organism.normFitness = Organism.normalizeFitness(total_fitness, RANGE_MAX, RANGE_MIN);
}

function drawOrganism(organism, context) {
	clearCanvas(context);
	organism.drawGenome(context);
}

function Organism() {
	this.chromosomes = [];
	this.fitness = 0;
	this.normFitness = 0.0;
	
	for (var i = Organism.NUM_CHROMOSOMES - 1; i >= 0; i--) {
		this.chromosomes[i] = new Chromosome();
	}
}

Organism.NUM_CHROMOSOMES = 50;

Organism.doOrganismCopy = function(source, dest) {
	for (var i = Organism.NUM_CHROMOSOMES - 1; i >= 0; i--) {
		var srcChrome =  source.chromosomes[i];
		var destChrome = dest.chromosomes[i];
		
		destChrome.r = srcChrome.r;
		destChrome.g = srcChrome.g;
		destChrome.b = srcChrome.b;
		destChrome.a = srcChrome.a;

		for (var i = Chromosome.NUM_VERTICES - 1; i >= 0; i--) {
			destChrome.pointsX[j] = srcChrome.pointsX[j];
			destChrome.pointsY[j] = srcChrome.pointsY[j];
		}
	}
}

Organism.doChromosomeCopy = function(source, dest, chromosomeIdx) {
		var srcChrome = source.chromosomes[chromosomeIdx];
		var destChrome = dest.chromosomes[chromosomeIdx];
		
		destChrome.r = srcChrome.r;
		destChrome.g = srcChrome.g;
		destChrome.b = srcChrome.b;
		destChrome.a = srcChrome.a;

		for (var i = Chromosome.NUM_VERTICES - 1; i >= 0; i--) {
			destChrome.pointsX[i] = srcChrome.pointsX[i];
			destChrome.pointsY[i] = srcChrome.pointsY[i];
		}
}

Organism.normalizeFitness = function(rawFitness, RANGE_MAX, RANGE_MIN) {
	return (((1-0) * (rawFitness - RANGE_MIN)) / (RANGE_MAX - RANGE_MIN)) + 0;
}

Organism.prototype.initializeRandomGenome = function() {
	for (var i = Organism.NUM_CHROMOSOMES - 1; i >= 0; i--) {
		this.chromosomes[i] = new Chromosome();
		this.chromosomes[i].randomizeGenes("all");
	}
}

Organism.doCrossover = function(parentOne, parentTwo) {
	var swapLocation = randInt(Organism.NUM_CHROMOSOMES);

	// remove end of arrays from swapLocation and return removed part
	var tempBufferA = parentOne.chromosomes.splice(swapLocation); 
	var tempBufferB = parentTwo.chromosomes.splice(swapLocation); 

	// swap removed ends of the arrays
	parentOne.chromosomes = parentOne.chromosomes.concat(tempBufferB); 
	parentTwo.chromosomes = parentTwo.chromosomes.concat(tempBufferA);
	
	/*var attributes = ["red", "green", "blue", "alpha", "pointsX", "pointsY"];
	
	var tempBuffer;
	switch(attributes[randInt(attributes.length)]) {
		case "red":
			tempBuffer = parentOne.
			break;
		case "green":
			break;
		case "blue":
			break;
		case "alpha":
			break;
		case "pointsX":
			break;
		case "pointsY":
			break;
										
	}*/
}

Organism.isToMutate = function() {
	return (randFloat(1.0) < 0.03);
}

Organism.isToCrossover = function() {
	return (randFloat(1.0) < 0.75);
}

Organism.prototype.mutate = function(mutationLevel) {
	var mutation_index = randInt(this.chromosomes.length);
	var randChromosome = this.chromosomes[mutation_index];
	var rouletteHit = randFloat(8.0);
	
	if(rouletteHit < 4.0) { // 50% chance of mutating polygon color
		switch(mutationLevel) {
			case "soft":
				break;
			case "medium":
				if(rouletteHit < 1.0) {
					randChromosome.randomizeGenes("red");
				} else if(rouletteHit >= 1.0 && rouletteHit < 2.0) {
					randChromosome.randomizeGenes("green");
				} else if(rouletteHit >= 2.0 && rouletteHit < 3.0) {
					randChromosome.randomizeGenes("blue");
				} else if(rouletteHit >= 3.0) {
					randChromosome.randomizeGenes("alpha");
				} 
				break;
			case "hard":
				break;
			default:
				err("unrecognized mutation level: " + mutationLevel);
		}
	} else { // 50% chance of mutating polygon vertices
		switch(mutationLevel) {
			case "soft":
				break;
			case "medium":
				if(rouletteHit < 6.0) {
					randChromosome.randomizeGenes("pointsX");
				} else if(rouletteHit >= 6.0 && rouletteHit < 8.0){
					randChromosome.randomizeGenes("pointsY");
				}
				break;
			case "hard":
				break;
			default:
				err("unrecognized mutation level: " + mutationLevel);
		}
	}
	
	MUTATION_COUNT++;
	return mutation_index;
}

Organism.prototype.drawGenome = function(context) {
	for (var i = Organism.NUM_CHROMOSOMES - 1; i >= 0; i--) {
		this.chromosomes[i].draw(context);
	};
}

function Chromosome() {
	this.pointsX = [];
	this.pointsY = [];
	this.r = 0;
	this.g = 0;
	this.b = 0;
	this.a = 0.0;
}

Chromosome.NUM_VERTICES = 6;

Chromosome.prototype.randomizeGenes = function(genes) {
	switch(genes) {
		case "red":
			this.r = randInt(256);
			break;
		case "green":
			this.g = randInt(256);
			break;
		case "blue":
			this.b = randInt(256);
			break;
		case "alpha":
			this.a = randFloat(1.0);
			break;
		case "pointsX":
			this.pointsX = [];
			for (var i = Chromosome.NUM_VERTICES - 1; i >= 0; i--) {
				this.pointsX[i] = randInt(IMAGE_WIDTH);
			}
			break;
		case "pointsY":
			this.pointsY = [];
			for (var i = Chromosome.NUM_VERTICES - 1; i >= 0; i--) {
				this.pointsY[i] = randInt(IMAGE_HEIGHT);
			}
			break;
		case "pointsXY":
			this.pointsX = [];
			this.pointsY = [];
			for (var i = Chromosome.NUM_VERTICES - 1; i >= 0; i--) {
				this.pointsX[i] = randInt(IMAGE_WIDTH);
				this.pointsY[i] = randInt(IMAGE_HEIGHT);
			}
			break;
		case "all":
			this.r = randInt(256);
			this.g = randInt(256);
			this.b = randInt(256);
			this.a = 1.0;//randFloat(1.0);

			this.pointsX.length = [];
			this.pointsY.length = [];
			
			for (var i = Chromosome.NUM_VERTICES - 1; i >= 0; i--) {
				this.pointsX[i] = randInt(IMAGE_WIDTH);
				this.pointsY[i] = randInt(IMAGE_HEIGHT);
			}

			break;
		case "test-only":
			this.r = 255;
			this.g = 255;
			this.b = 255;
			this.a = 1.0;
			
			this.pointsX.length = [];
			this.pointsY.length = [];
			
			for (var i = Chromosome.NUM_VERTICES - 1; i >= 0; i--) {
				this.pointsX[i] = randInt(IMAGE_WIDTH);
				this.pointsY[i] = randInt(IMAGE_HEIGHT);
			}

			break;
		default: 
			err("genes to randomize not found: " + genes);
	}
}

Chromosome.prototype.draw = function(context) {
	context.fillStyle = "rgba(" + this.r + "," + this.g + "," + this.b + "," + this.a + ")";
	context.beginPath();
	
	context.moveTo(this.pointsX[0], this.pointsY[0]);
	
	for(var i = 0, l = Chromosome.NUM_VERTICES; i < l; i++) {
	  context.lineTo(this.pointsX[i], this.pointsY[i]);
	};
	
	context.closePath();
	context.fill();
}


// UTILITY/CONVENIENCE/OTHER functions
function clearCanvas(context) {
	context.clearRect(0, 0, IMAGE_WIDTH, IMAGE_HEIGHT);
}

function toggleEvolution() {
	IS_EVOLVING = !IS_EVOLVING;
	
	if(!IS_EVOLVING) {
		startPauseToggle.value = "Start evolution";
		pauseEvolution();
	} else {
		startPauseToggle.value = "Pause evolution";
		startEvolution();
	}
}

function changeSourceImage(url) {
	if(url === null || url.toString().length === 0 || url.toString().indexOf("http://", 0) === -1) {
		warn("cannot change source to invalid image: " + url);
		return;
	}
	img.src = url;
	
	img.onload = function() {
		initImage();
		initOrganisms();
		initOtherStuff();
	}
}

function randInt(seed) {
	return (Math.random() * seed) | 0;
}

function randFloat(seed) {
	return (Math.random() * seed);
}

function raw(s) {
	LOG_WINDOW.value += (s + "\n");
}

function debug(s) {
	LOG_WINDOW.value += ("debug: " + s + "\n");
}

function err(s) {
	LOG_WINDOW.value += ("error: " + s + "\n");
}

function warn(s) {
	LOG_WINDOW.value += ("warning: " + s + "\n");
}

function printStats() {
	raw("============STATS============");
	raw("current generation: " + GENERATION_COUNT);
	raw("best fitness so far: " + ((1.0-BEST_FITNESS) * 100).toFixed(2)+"%");
	raw("total mutations so far: " + MUTATION_COUNT);
	raw("elapsed time: " + (SECOND_COUNT/60).toFixed(0) + " minutes " + (SECOND_COUNT % 60) + " seconds");
	raw("=============================");
}

// PROGRAM INITIALIZATION
window.onload = function() {
	init();
}
