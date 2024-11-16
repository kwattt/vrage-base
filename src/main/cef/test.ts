export const test = (epic: string) => {
  console.log('Hello, world FROM VTEST vue test!', epic);
  if(!mp)
    return console.error('mp is not defined')
  mp.trigger('wololo')
}