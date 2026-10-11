'use strict';
(function(root){
 let sequence=0;
 function sprite(source,index,columns,rows,width,height,overlay=''){
  const x=-(index%columns)*width,y=-Math.floor(index/columns)*height;
  const clip='pippo-cell-'+(++sequence);
  return `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><clipPath id="${clip}"><rect width="${width}" height="${height}"/></clipPath></defs><g clip-path="url(#${clip})"><image href="${source}" x="${x}" y="${y}" width="${columns*width}" height="${rows*height}" preserveAspectRatio="none"/>${overlay}</g></svg>`;
 }
 root.PippoArt={sprite};
})(globalThis);
