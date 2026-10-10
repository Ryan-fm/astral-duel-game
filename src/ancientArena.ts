import {createKingdomLandscape,type LandscapeMaps} from './kingdomLandscape';
import {createArenaStage} from './arenaStage';
import {createKingdomEnvironment,type KingdomMaps} from './kingdomEnvironment';
export function createAncientArena(maps:KingdomMaps,landscapeMaps?:LandscapeMaps){
 const inlays=createArenaStage(false),world=createKingdomEnvironment(maps);world.group.add(inlays.group);const landscape=landscapeMaps?createKingdomLandscape(landscapeMaps):null;if(landscape)world.group.add(landscape.group);
 return {group:world.group,update(time:number,motion:boolean){world.update(time,motion);landscape?.update(time,motion);inlays.update(time,motion);},dispose(){inlays.dispose();landscape?.dispose();world.dispose();}};
}
