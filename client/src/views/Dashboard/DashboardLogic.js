import { useState, useEffect, useContext } from "react";
import { Web3Context } from "../../web3";
import {DEPLOY_BLOCK} from '../../web3/constants';
import axios from "axios";

const DashboardLogic = () => {
  const { contracts, account, connectWeb3, web3 } = useContext(Web3Context);

  //state
  const [allNFTs, setAllNFTs] = useState([]);
  const [myNFTs, setMyNFTs] = useState([]);
  const [filters, setFilters] = useState([]);
  const [search, setSearch] = useState("");

  const getData = async () => {
    if(web3){
      let search = await contracts.nft1155.getPastEvents('newNFT', {fromBlock: DEPLOY_BLOCK, toBlock: 'latest'})
      let allEvents = [];
      let filter = [];
      for (const element of search) {
        let x = await contracts.nft1155.methods.uri(element.returnValues.id).call();
        let resp = await axios.get(`https://ipfs.io/ipfs/${x.split("ipfs://").join("")}`);
        let tieneCat = false;
        resp.data.attributes.forEach(element => {
          if(element.trait_type === "Category"){
            if(!filter.includes(element.value)){
              filter.push(element.value);
              tieneCat = true;
            } 
          }
        });
        if(!tieneCat){
          if(!filter.includes("Unknown")){
            filter.push("Unknown");
          } 
        }
        resp.data.image = `https://ipfs.io/ipfs/${resp.data.image.split("ipfs://").join("")}`
  
        let sellOrders = await contracts.marketplace.getPastEvents('Sell', {fromBlock: DEPLOY_BLOCK, toBlock: 'latest'})
        let mayor = Number(web3.utils.fromWei("1"));
        for (const element2 of sellOrders) {
          const order = element2.returnValues;
          if(String(order.tokenId) === String(element.returnValues.id)){
            const details = await contracts.marketplace.methods.orders(order.orderId).call();
            if(details.active){
              let x = {}
              x.seller = details.seller;
              x.amount = Number(details.amount);
              x.price = Number(web3.utils.fromWei(String(details.price)));
              let price = parseFloat((x.price/x.amount).toFixed(3))
              console.log(`price`, price)
              if(price > mayor) mayor = price;
            }
          }
        }
  
        allEvents.push({
          price: mayor,
          ...element.returnValues, 
          data: resp.data, 
        });
      }
      
      setFilters(filter)
      setMyNFTs(allEvents);
      setAllNFTs(allEvents);
    }
  }

  const doSearch = (e) => {
    setSearch(e.target.value);
    if(e.target.value === ""){
      setMyNFTs(allNFTs);
    }else{
      let nuevo = []
      allNFTs.forEach(element => {
        if(element.data.name.toLowerCase().includes(e.target.value.toLowerCase()) || element.data.description.toLowerCase().includes(e.target.value.toLowerCase())){
          nuevo.push(element)
        }
      });
      setMyNFTs(nuevo);
    }
  }

  useEffect(() => {
    if(web3) getData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, web3])

  return {
    getData,
    doSearch,
    connectWeb3,
    search,
    myNFTs,
    filters,
    account
  }
}

export default DashboardLogic;