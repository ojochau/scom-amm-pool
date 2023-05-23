export default {
"abi":[
{"inputs":[{"internalType":"address","name":"_governance","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},
{"anonymous":false,"inputs":[{"indexed":true,"internalType":"bytes32","name":"name","type":"bytes32"},{"indexed":false,"internalType":"bytes32","name":"value","type":"bytes32"}],"name":"ParamSet","type":"event"},
{"inputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"name":"customParam","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},
{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"customParamNames","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},
{"inputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"name":"customParamNamesIdx","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
{"inputs":[],"name":"customParamNamesLength","outputs":[{"internalType":"uint256","name":"length","type":"uint256"}],"stateMutability":"view","type":"function"},
{"inputs":[],"name":"governance","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
{"inputs":[{"internalType":"bytes32","name":"paramName","type":"bytes32"},{"internalType":"bytes32","name":"paramValue","type":"bytes32"}],"name":"setCustomParam","outputs":[],"stateMutability":"nonpayable","type":"function"},
{"inputs":[{"internalType":"bytes32[]","name":"paramName","type":"bytes32[]"},{"internalType":"bytes32[]","name":"paramValue","type":"bytes32[]"}],"name":"setMultiCustomParam","outputs":[],"stateMutability":"nonpayable","type":"function"}
],
"bytecode":"60a060405234801561001057600080fd5b506040516106f43803806106f48339818101604052602081101561003357600080fd5b5051606081901b6001600160601b0319166080526001600160a01b031661068361007160003980610251528061033e52806103a652506106836000f3fe608060405234801561001057600080fd5b506004361061007d5760003560e01c806395a57b1c1161005b57806395a57b1c1461019a578063bc14128f146101b4578063f28ea8fe146101d1578063f4a58b19146101ee5761007d565b80635332c414146100825780635aa6e675146100a75780637e9d2c31146100d8575b600080fd5b6100a56004803603604081101561009857600080fd5b508035906020013561020b565b005b6100af61033c565b6040805173ffffffffffffffffffffffffffffffffffffffff9092168252519081900360200190f35b6100a5600480360360408110156100ee57600080fd5b81019060208101813564010000000081111561010957600080fd5b82018360208201111561011b57600080fd5b8035906020019184602083028401116401000000008311171561013d57600080fd5b91939092909160208101903564010000000081111561015b57600080fd5b82018360208201111561016d57600080fd5b8035906020019184602083028401116401000000008311171561018f57600080fd5b509092509050610360565b6101a261053b565b60408051918252519081900360200190f35b6101a2600480360360208110156101ca57600080fd5b5035610541565b6101a2600480360360208110156101e757600080fd5b5035610553565b6101a26004803603602081101561020457600080fd5b5035610565565b604080517fa3818b3b000000000000000000000000000000000000000000000000000000008152336004820152905173ffffffffffffffffffffffffffffffffffffffff7f0000000000000000000000000000000000000000000000000000000000000000169163a3818b3b916024808301926020929190829003018186803b15801561029757600080fd5b505afa1580156102ab573d6000803e3d6000fd5b505050506040513d60208110156102c157600080fd5b505161032e57604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600f60248201527f4e6f742066726f6d20766f74696e670000000000000000000000000000000000604482015290519081900360640190fd5b6103388282610583565b5050565b7f000000000000000000000000000000000000000000000000000000000000000081565b604080517fa3818b3b000000000000000000000000000000000000000000000000000000008152336004820152905173ffffffffffffffffffffffffffffffffffffffff7f0000000000000000000000000000000000000000000000000000000000000000169163a3818b3b916024808301926020929190829003018186803b1580156103ec57600080fd5b505afa158015610400573d6000803e3d6000fd5b505050506040513d602081101561041657600080fd5b505161048357604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600f60248201527f4e6f742066726f6d20766f74696e670000000000000000000000000000000000604482015290519081900360640190fd5b828181146104f257604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601060248201527f6c656e677468206e6f74206d6174636800000000000000000000000000000000604482015290519081900360640190fd5b60005b818110156105335761052b86868381811061050c57fe5b9050602002013585858481811061051f57fe5b90506020020135610583565b6001016104f5565b505050505050565b60015490565b60006020819052908152604090205481565b60026020526000908152604090205481565b6001818154811061057257fe5b600091825260209091200154905081565b600082815260208190526040902081905560015415806105ca57506000828152600260205260409020546001805484929081106105bc57fe5b906000526020600020015414155b15610613576001805460008481526002602052604081208290558183018355919091527fb10e2d527612073b26eecdfd717e6a320cf44b4afac2b0732d9fcbe2b7fa0cf6018290555b60408051828152905183917f22ea5a9dcc7fb5bc447fcb472061adc51caa147724a67a6695d49a9dff162509919081900360200190a2505056fea2646970667358221220e9474db5abfeff54aca5cd1e7175987c5f3951450c1bbeacc0dc8da4150be36364736f6c634300060b0033"
}