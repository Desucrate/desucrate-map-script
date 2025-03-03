// Continents.ts
/**
 * Base game map script - Produces widely varied continents.
 * @packageDocumentation
 */
console.log("Generating using script Continents.ts");
import { assignStartPositions, chooseStartSectors } from '/base-standard/maps/assign-starting-plots.js';
import { addMountains, addHills, expandCoasts, buildRainfallMap, generateLakes } from '/base-standard/maps/elevation-terrain-generator.js';
import { addFeatures, designateBiomes } from '/base-standard/maps/feature-biome-generator.js';
import * as globals from '/base-standard/maps/map-globals.js';
import * as utilities from '/base-standard/maps/map-utilities.js';
import { addNaturalWonders } from '/base-standard/maps/natural-wonder-generator.js';
import { generateResources } from '/base-standard/maps/resource-generator.js';
import { addVolcanoes } from '/base-standard/maps/volcano-generator.js';
import { assignAdvancedStartRegions } from '/base-standard/maps/assign-advanced-start-region.js';
import { generateDiscoveries } from '/base-standard/maps/discovery-generator.js';
import { generateSnow, dumpPermanentSnow } from '/base-standard/maps/snow-generator.js';
import { dumpStartSectors, dumpContinents, dumpTerrain, dumpElevation, dumpRainfall, dumpBiomes, dumpFeatures, dumpResources, dumpNoisePredicate } from '/base-standard/maps/map-debug-helpers.js';
function requestMapData(initParams) {
    console.log(initParams.width);
    console.log(initParams.height);
    console.log(initParams.topLatitude);
    console.log(initParams.bottomLatitude);
    console.log(initParams.wrapX);
    console.log(initParams.wrapY);
    console.log(initParams.mapSize);
    engine.call("SetMapInitData", initParams);
}
function generateMap() {
    console.log("Generating a map!");
    console.log(`Age - ${GameInfo.Ages.lookup(Game.age).AgeType}`);
    let iWidth = GameplayMap.getGridWidth();
    let iHeight = GameplayMap.getGridHeight();
    let uiMapSize = GameplayMap.getMapSize();
    let startPositions = [];
    let mapInfo = GameInfo.Maps.lookup(uiMapSize);
    if (mapInfo == null)
        return;
    // Establish continent boundaries
    let iOceanWaterColumns = globals.g_OceanWaterColumns;
    let westContinent = {
        west: iOceanWaterColumns / 2,
        east: (iWidth / 2) - (iOceanWaterColumns / 2),
        south: globals.g_PolarWaterRows,
        north: iHeight - globals.g_PolarWaterRows,
        continent: 0
    };
    let eastContinent = {
        west: (iWidth / 2) + (iOceanWaterColumns / 2),
        east: iWidth - (iOceanWaterColumns / 2),
        south: globals.g_PolarWaterRows,
        north: iHeight - globals.g_PolarWaterRows,
        continent: 0
    };
    let startSectors;
    let iNumPlayers1 = mapInfo.PlayersLandmass1;
    let iNumPlayers2 = mapInfo.PlayersLandmass2;
    let iNumNaturalWonders = mapInfo.NumNaturalWonders;
    let iTilesPerLake = mapInfo.LakeGenerationFrequency;
    let iStartSectorRows = mapInfo.StartSectorRows;
    let iStartSectorCols = mapInfo.StartSectorCols;
    let iRandom = TerrainBuilder.getRandomNumber(2, "East or West");
    if (iRandom == 1) {
        let iNum1 = iNumPlayers1;
        let iNum2 = iNumPlayers2;
        iNumPlayers1 = iNum2;
        iNumPlayers2 = iNum1;
    }
    let bHumanNearEquator = utilities.needHumanNearEquator();
    startSectors = chooseStartSectors(iNumPlayers1, iNumPlayers2, iStartSectorRows, iStartSectorCols, bHumanNearEquator);
    createLandmasses(iWidth, iHeight, westContinent, eastContinent, iStartSectorRows, iStartSectorCols, startSectors);
    TerrainBuilder.validateAndFixTerrain();
    expandCoasts(iWidth, iHeight);
    utilities.adjustOceanPlotTags(iNumPlayers1 > iNumPlayers2);
    AreaBuilder.recalculateAreas();
    TerrainBuilder.stampContinents();
    addMountains(iWidth, iHeight);
    addVolcanoes(iWidth, iHeight);
    generateLakes(iWidth, iHeight, iTilesPerLake);
    AreaBuilder.recalculateAreas();
    TerrainBuilder.buildElevation();
    addHills(iWidth, iHeight);
    buildRainfallMap(iWidth, iHeight);
    TerrainBuilder.modelRivers(5, 15, globals.g_NavigableRiverTerrain);
    TerrainBuilder.validateAndFixTerrain();
    TerrainBuilder.defineNamedRivers();
    designateBiomes(iWidth, iHeight);
    addNaturalWonders(iWidth, iHeight, iNumNaturalWonders);
    TerrainBuilder.addFloodplains(4, 10);
    addFeatures(iWidth, iHeight);
    TerrainBuilder.validateAndFixTerrain();
    AreaBuilder.recalculateAreas();
    TerrainBuilder.storeWaterData();
    generateSnow(iWidth, iHeight);
    dumpStartSectors(startSectors);
    dumpContinents(iWidth, iHeight);
    dumpTerrain(iWidth, iHeight);
    dumpElevation(iWidth, iHeight);
    dumpRainfall(iWidth, iHeight);
    dumpBiomes(iWidth, iHeight);
    dumpFeatures(iWidth, iHeight);
    dumpPermanentSnow(iWidth, iHeight);
    generateResources(iWidth, iHeight, westContinent, eastContinent, iNumPlayers1, iNumPlayers2);
    startPositions = assignStartPositions(iNumPlayers1, iNumPlayers2, westContinent, eastContinent, iStartSectorRows, iStartSectorCols, startSectors);
    generateDiscoveries(iWidth, iHeight, startPositions);
    dumpResources(iWidth, iHeight);
    FertilityBuilder.recalculate(); // Must be after features are added.
    let seed = GameplayMap.getRandomSeed(); // can use any seed you want for different noises
    let avgDistanceBetweenPoints = 3;
    let normalizedRangeSmoothing = 2;
    let poisson = TerrainBuilder.generatePoissonMap(seed, avgDistanceBetweenPoints, normalizedRangeSmoothing);
    let poissonPred = (val) => {
        return val >= 1 ? "*" : " ";
    };
    dumpNoisePredicate(iWidth, iHeight, poisson, poissonPred);
    assignAdvancedStartRegions();
}
// Register listeners.
engine.on('RequestMapInitData', requestMapData);
engine.on('GenerateMap', generateMap);
console.log("Loaded Continents.ts");
console.log("hey, continents is firing");
function createLandmasses(iWidth, iHeight, continent1, continent2, iStartSectorRows, iStartSectorCols, startSectors) {
    FractalBuilder.create(globals.g_LandmassFractal, iWidth, iHeight, 2, 0);
    let iWaterHeight = FractalBuilder.getHeightFromPercent(globals.g_LandmassFractal, globals.g_WaterPercent);
    let iBuffer = Math.floor(iHeight / 18.0);
    let iBuffer2 = Math.floor(iWidth / 28.0);
    for (let iY = 0; iY < iHeight; iY++) {
        for (let iX = 0; iX < iWidth; iX++) {
            let terrain = globals.g_FlatTerrain;
            let iRandom = TerrainBuilder.getRandomNumber(iBuffer, "Random Top/Bottom Edges");
            let iRandom2 = TerrainBuilder.getRandomNumber(iBuffer2, "Random Left/Right Edges");
            // Initialize plot tag
            TerrainBuilder.setPlotTag(iX, iY, PlotTags.PLOT_TAG_NONE);

            let iPlotHeight = utilities.getHeightAdjustingForStartSector(iX, iY, iWaterHeight, globals.g_FractalWeight, globals.g_CenterWeight, globals.g_StartSectorWeight, continent1, continent2, iStartSectorRows, iStartSectorCols, startSectors);
            // Finally see whether or not this stays as Land or has too low a score and drops back to water
            if (iPlotHeight < iWaterHeight * globals.g_Cutoff) {
                let iSector = utilities.getSector(iX, iY, iStartSectorRows, iStartSectorCols, continent1.south, continent1.north, continent1.west, continent1.east, continent2.west);
                if (startSectors[iSector]) {
                    terrain = globals.g_CoastTerrain;
                }
                else {
                    terrain = globals.g_OceanTerrain;
                }
            }
            // Add plot tag if applicable
            if (terrain != globals.g_OceanTerrain && terrain != globals.g_CoastTerrain) {
                utilities.addLandmassPlotTags(iX, iY, continent2.west);
            }
            else {
                utilities.addWaterPlotTags(iX, iY, continent2.west);
            }
            TerrainBuilder.setTerrainType(iX, iY, terrain);
        }
    }
}

//# sourceMappingURL=file:///base-standard/maps/continents.js.map
