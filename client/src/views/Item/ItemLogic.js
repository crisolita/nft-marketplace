import { useState, useEffect, useContext } from "react";
import {useParams } from 'react-router-dom';
import { Web3Context } from "../../web3";
// import Swal from 'sweetalert2'
import {MARKETPLACE_CONTRACT_ADDRESS, DEPLOY_BLOCK} from '../../web3/constants';
import axios from "axios";
// import ipfs from "../../utils/ipfs";

const ItemLogic = () => {
  const { contracts, account, web3, connectWeb3, itemOwner, transferItem, showOwnerContent} = useContext(Web3Context);
  const { id } = useParams();

  //state
  const [item, setItem] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showModalTransfer, setShowModalTransfer] = useState(false);
  const [isItemOwner, setIsItemOwner] = useState(false);
  const [transferTo, setTransferTo] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [sellAmount, setSellAmount] = useState("");
  const [sellOffers, setSellOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingBuy, setLoadingBuy] = useState(false);
  const [loadingSell, setLoadingSell] = useState(false);
  const [loadingTransfer, setLoadingTransfer] = useState(false);
  const [ownerContent, setOwnerContent] = useState("");
  const [amountOwn, setAmountOwn] = useState(0);

  const getData = async () => {
    if(web3){
      try {
        let x = await contracts.nft1155.methods.uri(id).call();
        let resp = await axios.get(`https://ipfs.io/ipfs/${x.split("ipfs://").join("")}`);
        resp.data.image = `https://ipfs.io/ipfs/${resp.data.image.split("ipfs://").join("")}`
        setItem({
          data: resp.data,
        });
        getOrders();
        setLoading(false)
        if(account){
          let own = await contracts.nft1155.methods.balanceOf(account,id).call();
          setAmountOwn(own);
        }
      } catch (error) {
        console.log(`error`, error)
      }
    }
  }

  const getOrders = async () => {
    try {
      if(web3){
        let sellOrders = await contracts.marketplace.getPastEvents('Sell', {fromBlock: DEPLOY_BLOCK, toBlock: 'latest'})
        let toOrder = [];

        for (const element of sellOrders) {
          const order = element.returnValues;
          if(order.tokenId === id){
            const details = await contracts.marketplace.methods.orders(order.orderId).call();
            if(details.active){
              let x = {}
              x.orderId = details.orderId;
              x.seller = details.seller;
              x.amount = Number(details.amount);
              x.price = Number(web3.utils.fromWei(String(details.price)));
              toOrder.push(x);
            }
          }
        }

        setSellOffers(toOrder);
      }
    } catch (error) {
      console.log(`error`, error)
    }
  }

  const buy = async (order) => {
    if(account){
      setLoadingBuy(true);
      await contracts.marketplace.methods.buy(order.orderId).send({from: account, value: web3.utils.toWei(String(order.price))});

      setLoadingBuy(false);
      getData();
    }else{
      connectWeb3();
    }
  }

  const sell = async () => {
    if(account){
      setLoadingSell(true);
      let approved = await contracts.nft1155.methods.isApprovedForAll(account, MARKETPLACE_CONTRACT_ADDRESS).call();

      if(!approved){
        await contracts.nft1155.methods.setApprovalForAll(MARKETPLACE_CONTRACT_ADDRESS, true).send({from: account});
      }
      
      await contracts.marketplace.methods.sell(id, sellAmount, web3.utils.toWei(String(sellPrice))).send({from: account});
      setSellAmount("");
      setSellPrice("");
      setLoadingSell(false);
      setShowModal(false);
      getData();
    }
  }

  const transfer = async () => {
    if(account){
      setLoadingTransfer(true);
      await transferItem(transferTo, id, transferAmount);
      setTransferTo("");
      setTransferAmount("");
      setLoadingTransfer(false);
      setShowModalTransfer(false);
    }
  }

  useEffect(() => {
    getData();
    showOwnerContent(id).then((data) => {
      setOwnerContent(data)
    })
    itemOwner(id).then(resp => {
      setIsItemOwner(resp)
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [web3, account])

  return {
    buy,
    sell,
    setSellAmount,
    setSellPrice,
    setShowModal,
    setShowModalTransfer,
    setTransferTo,
    setTransferAmount,
    transfer,
    showModalTransfer,
    transferTo,
    transferAmount,
    account,
    showModal,
    loadingBuy,
    loadingSell,
    loading,
    isItemOwner,
    item,
    sellOffers,
    sellPrice,
    sellAmount,
    loadingTransfer,
    ownerContent,
    amountOwn
  }
}

export default ItemLogic;