export const test = () => {
  console.log('Hello, world FROM VTEST vue test!');
  if(!mp)
    return console.error('mp is not defined')
  mp.trigger('wololo')
}