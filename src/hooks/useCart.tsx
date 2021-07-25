import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {

    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
       return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart];//imutabilidade
      //verifica se produto existe no carrinho com .find que retorna este produto se verdadeiro
      const productExists = updatedCart.find(product => product.id === productId);
      //verifica se qtd solicitada existe em stock
      const stock = await api.get(`/stock/${productId}`);
      const stockAmount = stock.data.amount;
      const currentAmount = productExists ? productExists.amount : 0;
      const amountRequested = currentAmount + 1;

      if (amountRequested > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      } 

      if (productExists) {
        productExists.amount = amountRequested;//productExists tem o mesmo endereço de memoria do updatedCart, quando alteramos o productExists, o item tambem sera alterado no updatedCart, porem o cart fica inalterado 
      } else {
        const product = await api.get(`/products/${productId}`);
        //como o product que retorna da api nao tem amount, devemos criar um novo product inserindo a qtd requisitada
        const newProduct = {
          ...product.data,
          amount: 1,
        }
        updatedCart.push(newProduct);
      }
      //depois de toda verificacao e atualizacao, perpetue o cart no estado e localStorage
      setCart(updatedCart);
      //o setCart alterou o cart que permanecia imultavel no estado ate este momento; porem ainda nao esta disponivel para no runtime, entao passe o updatedCart para o localStorage
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart]; //respeitando a imutabilidade
      const productIndex = updatedCart.findIndex(product => product.id === productId); //retorna o index encontrado ou -1

      if (productIndex >= 0) {
        updatedCart.splice(productIndex, 1);//index, qtd to remove
        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      } else {  
        throw Error(); //forca chamada do catch
      }

    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const stock = await api.get(`/stock/${productId}`);
      const stockAmount = stock.data.amount;
      
      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      } 

      const updatedCart = [...cart];
      const productExists = updatedCart.find(product => product.id === productId);

      if (productExists) {
        productExists.amount = amount
        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      } else {
        throw Error();
      }

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
