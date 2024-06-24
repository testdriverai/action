let exitcode = "0\n"

console.log(exitcode)
console.log(typeof exitcode)

const isPassed = parseInt(exitcode) === 0;

if (!isPassed) {
  console.log('failed')
} else {
  console.log('passed')
}
