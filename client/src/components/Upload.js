import React, { useState, useContext, useEffect } from "react";
import { Container, Row, Col, Form, Button, Spinner } from "react-bootstrap";
import Swal from 'sweetalert2'
import ipfs from "../utils/ipfs";
import { Web3Context } from "../web3";

// Upload Loan Details to IPFS and
// trigger Loan Creation to Smart Contract
export default function Upload() {
  const { account, mintToken } = useContext(Web3Context);

  // Component State
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState(null);
  const [tokenAmount, setTokenAmount] = useState(0);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [attributes, setAttributes] = useState([]);
  const [changing, setChanging] = useState(false);
  const [royalty, setRoyalty] = useState("");
  const [ownerContent, setOwnerContent] = useState("");
  const [externalUrl, setExternalUrl] = useState("");

  // Load File and convert to Buffer
  const loadFile = (_file) => {
    setFileName(_file.name);
    var reader = new FileReader();
    reader.readAsArrayBuffer(_file);
    reader.onloadend = () => {
      console.log(Buffer(reader.result));
      setFile(Buffer(reader.result));
    };
  };

  // Add content to IPFS and return HASH
  const addToIpfs = async (content) => {
    console.log("adding to IPFS...");
    const added = await ipfs.add(content, {
      progress: (prog) => console.log(`received: ${prog}`),
    });
    return added.cid.toString();
  };

  // Request Loan to Blockchain Smart Contract
  const createToken = async () => {
    if(account){
      setLoading(true)
      if(!file || tokenAmount === "" || royalty === "" || externalUrl === "" || name === "" || description === "" || ownerContent === "" || externalUrl === ""){
        Swal.fire(
          'Empty fields',
          '',
          'error'
        )
        setLoading(false)
        return;
      }
      const ipfsHash = await addToIpfs(file);
      let loadAttributes = [];
      loadAttributes.push({
        trait_type: "Token amount",
        value: tokenAmount,
      })
      loadAttributes.push({
        trait_type: "Royalty %",
        value: royalty,
      })
      loadAttributes.push({
        trait_type: "External URL",
        value: externalUrl,
      })
      attributes.forEach(element => {
        loadAttributes.push({
          trait_type: element.type,
          value: element.value,
        })
      });

      const schema = {
        name,
        description,
        image: "ipfs://" + ipfsHash,
        attributes: loadAttributes
      };
      const schemaHash = await addToIpfs(JSON.stringify(schema));
      console.log(`schemaHash`, schemaHash)
  
      // Trigger Tx to smart contract
      try {
        const idCreated = await mintToken(tokenAmount, royalty, ownerContent, schemaHash);

        setLoading(false)
        Swal.fire({
          title: 'NFT created!',
          icon: 'success',
          showDenyButton: false,
          showCancelButton: true,
          cancelButtonText: `Ok`,
          confirmButtonText: `Go to item`,
          reverseButtons: true
        }).then((result) => {
          if (result.isConfirmed) {
            window.location = `/item/${idCreated}`;
          }else{
            window.location = "/";
          }
        })
      } catch (error) {
        setLoading(false)
        if(error.message === "MetaMask Tx Signature: User denied transaction signature."){
          Swal.fire(
            'Transaction signature denied',
            '',
            'error'
          )
        }else{
          Swal.fire(
            error.message,
            '',
            'error'
          )
        }
      }
    }else{
      Swal.fire(
        'Conection error',
        '',
        'error'
      )
      console.log("connect to eth")
    }
  };

  const addNew = () => {
    setChanging(true);
    let x = attributes;
    x.push({type: '', value:''});
    setAttributes(x);
  }

  const setNewAttribute = (e, index) => {
    let x = attributes;
    x[index][e.target.name] = e.target.value;
    setAttributes(x);
  }

  useEffect(() => {
    setChanging(false)
  }, [changing])

  return (
    <Container>
      
      <Form className="mt-5">
        {/* Token Name */}
        <Form.Group as={Row}>
          <Form.Label column sm="3">
            Name
          </Form.Label>
          <Col sm="9" className="align-self-center">
            <Form.Control
              type="text"
              // placeholder="Token Name"
              onChange={(e) => setName(e.target.value)}
            />
          </Col>
        </Form.Group>

        {/* Token Description */}
        <Form.Group as={Row}>
          <Form.Label column sm="3">
            Description
          </Form.Label>
          <Col sm="9" className="align-self-center">
            <Form.Control
              type="text"
              // placeholder="Token description details"
              onChange={(e) => setDescription(e.target.value)}
            />
          </Col>
        </Form.Group>

        {/* Token Amount */}
        <Form.Group as={Row}>
          <Form.Label column sm="3">
            Token amount
          </Form.Label>
          <Col sm="9" className="align-self-center">
            <Form.Control
              type="number"
              // placeholder="Amount"
              onChange={(e) => setTokenAmount(e.target.value)}
            />
          </Col>
        </Form.Group>

        {/* Royalty */}
        <Form.Group as={Row}>
          <Form.Label column sm="3">
            Royalty %
          </Form.Label>
          <Col sm="9" className="align-self-center">
            <Form.Control
              type="number"
              // placeholder="Amount"
              onChange={(e) => setRoyalty(e.target.value)}
            />
          </Col>
        </Form.Group>

        {/* Token Amount */}
        <Form.Group as={Row}>
          <Form.Label column sm="3">
            External URL
          </Form.Label>
          <Col sm="9" className="align-self-center">
            <Form.Control
              type="text"
              // placeholder="Amount"
              onChange={(e) => setExternalUrl(e.target.value)}
            />
          </Col>
        </Form.Group>

        {/* Owner Content */}
        <Form.Group as={Row}>
          <Form.Label column sm="3">
            Owner Content
          </Form.Label>
          <Col sm="9" className="align-self-center">
            <Form.Control
              type="text"
              // placeholder="Amount"
              onChange={(e) => setOwnerContent(e.target.value)}
            />
          </Col>
        </Form.Group>

        {!changing && attributes.map((element, index)=>(
          <Form.Group as={Row} key={`attri${index}`}>
            <Form.Label column sm="3">
              <Form.Control
                type="text"
                name="type"
                defaultValue={element.type}
                onChange={(e) => setNewAttribute(e, index)}
              />
            </Form.Label>
            <Col sm="9" className="align-self-center">
              <Form.Control
                type="text"
                name="value"
                defaultValue={element.value}
                onChange={(e) => setNewAttribute(e, index)}
              />
            </Col>
          </Form.Group>
        ))}

        <Row>
          <Col sm={3}>
            <Button size="sm" onClick={addNew} style={{display: 'flex', justifyContent: 'center', alignItems: 'center', margin: 'auto'}}>
              + Add attribute
            </Button>
          </Col>
        </Row>

        {/* <Form.Group as={Row}>
          <Form.Label column sm="3">
            Item price (in ETH)
          </Form.Label>
          <Col sm="9" className="align-self-center">
            <Form.Control
              type="number"
              // placeholder="Sell amount"
              onChange={(e) => setPrice(e.target.value)}
            />
          </Col>
        </Form.Group>

        <Form.Group as={Row}>
          <Form.Label column sm="3">
            Royalty porcentage
          </Form.Label>
          <Col sm="9" className="align-self-center">
            <Form.Control
              type="number"
              // placeholder="Royalty porcentage"
              onChange={(e) => setRoyalty(e.target.value)}
            />
          </Col>
        </Form.Group> */}

      </Form>

      {/* File Upload */}

      {fileName && (
        <label htmlFor="file" className="mb-5">
          <strong>File Uploaded: </strong>
          {fileName}
        </label>
      )}
      {/* {!file && ( */}
        <>
          <div id="upload-container">
            <div id="fileUpload">
              <input
                id="file"
                type="file"
                name="file"
                className="inputfile"
                onChange={(e) => loadFile(e.target.files[0])}
              />
              <label htmlFor="file" id="fileLabel">
                <p>Upload File</p>
              </label>
            </div>
          </div>
          <p className="mb-5" style={{fontSize: '0.9rem'}}>
            Please upload a PNG, GIF, WEBP, or MP4 Max 30mb
          </p>
        </>
      {/* )} */}

      <Button id="request-button" onClick={createToken} size="lg" disabled={loading} style={{display: 'flex', justifyContent: 'center', alignItems: 'center', margin: 'auto'}}>
        {loading ? <><Spinner animation="grow" variant="light" size="sm" style={{marginRight: '0.5rem'}}/>Creating...</> : "Create Token" }
      </Button>
    </Container>
  );
}
