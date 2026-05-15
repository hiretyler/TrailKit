// StatsEngine — pure aggregation helpers.
// No side effects. Apps call these in their render functions.
export const StatsEngine = {
  sumBy(items, prop){
    return items.reduce((acc, it)=> acc + (Number(it[prop]) || 0), 0);
  },

  countBy(items, predFn){
    return items.filter(predFn).length;
  },

  groupBy(items, keyFn){
    return items.reduce((acc, it)=>{
      const k = keyFn(it);
      if(!acc[k]) acc[k] = [];
      acc[k].push(it);
      return acc;
    }, {});
  },

  // Total weight of items by id list, resolved against an inventory array.
  totalWeightKg(idList, inventory){
    return idList.reduce((sum, id)=>{
      const it = inventory.find(i=>i.id===id);
      return sum + (it ? it.weightKg : 0);
    }, 0);
  },
};
