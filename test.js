const flag = false;
const newPromise = new Promise((resolve, reject) => {
  if (flag) {
    return resolve();
  }
  reject(console.log("rejected"));
});

async function main() {
  console.log(await newPromise);
}

main();
// console.log(newPromise.then());
