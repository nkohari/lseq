import {defaults} from 'lodash';
import {Ident, IdentGenerator, LSEQIdentGenerator, Segment} from './idents';
import {Storage, ArrayStorage} from './storage';
import {Op, OpKind, InsertOp, RemoveOp} from './Op';

/**
 * A CmRDT sequence that implements the LSEQ algorithm to support
 * concurrent simultaneous editing.
 */
export class Sequence<T> {
  
  /**
   * The unique replica id.
   */
  replica: string
  
  /**
   * The maximum depth of identifiers in the sequence.
   */
  maxDepth: number
  
  private storage: Storage<T>
  private idGenerator: IdentGenerator
  
  /**
   * Creates an instance of Sequence<T>.
   * @param replica The unique replica id for the sequence.
   * @param options Options that customize the sequence.
   * @returns An instance of Sequence<T>.
   */
  constructor(replica: string, storage?: Storage<T>, idGenerator?: IdentGenerator) {
    this.replica = replica;
    this.storage = storage || new ArrayStorage<T>();
    this.idGenerator = idGenerator || new LSEQIdentGenerator(replica);
    let [first, last] = this.idGenerator.getBookends();
    this.storage.add(first, null);
    this.storage.add(last, null);
  }
  
  /**
   * Gets the number of items in the sequence.
   * @returns The number of items in the sequence.
   */
  size(): number {
    return this.storage.size() - 2;
  }
  
  /**
   * Gets the depth of the sequence. (The maximum number of segments used by
   * an atom in the sequence.)
   * @returns The depth of the sequence.
   */
  depth(): number {
    return this.maxDepth;
  }
  
  /**
   * Inserts a value into the sequence at the specified position.
   * @param value The value to insert.
   * @param pos   The position at which to insert the value.
   * @returns An InsertOp that can be applied to other Sequences
   *          to reproduce the insertion.
   */
  insert(value: T, pos: number): InsertOp {
    let before = this.storage.get(pos);
    let after = this.storage.get(pos + 1);
    
    let id = this.idGenerator.getIdent(before.id, after.id);
    let op = new InsertOp(id, value);
    this.apply(op);
    
    if (this.maxDepth < id.getDepth()) this.maxDepth = id.getDepth();
    
    return op;
  }
  
  /**
   * Appends a value to the end of the sequence.
   * @param value The value to append.
   * @returns An InsertOp that can be applied to other Sequences
   *          to reproduce the insertion.
   */
  append(value: T): InsertOp {
    return this.insert(value, this.size());
  }
  
  /**
   * Removes the value at the specified position from the sequence.
   * @param pos The position of the value to remove.
   * @returns An RemoveOp that can be applied to other Sequences
   *          to reproduce the removal.
   */
  remove(pos: number): RemoveOp {
    let atom = this.storage.get(pos);
    if (atom) {
      let op = new RemoveOp(atom.id)
      this.apply(op);
      return op;
    }
    return null;
  }
  
  /**
   * Gets the value at the specified position in the sequence.
   * @param pos The desired position.
   * @returns The value at that position,
   *          or undefined if no such value exists. 
   */
  get(pos: number): T {
    const atom = this.storage.get(pos + 1);
    return atom ? atom.value : undefined;
  }
  
  /**
   * Applies a function to each of the values in the sequence.
   * @param func The function to apply.
   */
  forEach(func: { (T): void }): void {
    this.storage.forEach((atom) => func(atom.value));
  }
  
  /**
   * Applies a transformation function to each of the values in the sequence.
   * @param func The transformation function to apply.
   * @returns An array containing the results of the function calls.
   */ 
  map<R>(func: { (T): R }): R[] {
    return this.storage.map((atom) => func(atom.value));
  }
  
  /**
   * Converts the sequence to an array.
   * @returns An array representation of the values in the sequence.
   */ 
  toArray(): T[] {
    return this.storage.map((atom) => atom.value);
  }
  
  /**
   * Converts the sequence to a compact object suitable for serialization.
   * @returns A serializable object.
   */
  toJSON(): Object {
    return {
      r: this.replica,
      d: this.storage.map((atom) => [atom.id.toString(), atom.value])
    }
  }
  
  /**
   * Applies the specified Op to the sequence. Typically this is used
   * to apply operations that have been generated by remote sequences.
   * @param op The Op to apply.
   */
  apply(op: Op): void {
    switch (op.kind) {
      case OpKind.Insert:
        let insertOp = <InsertOp> op; 
        this.storage.add(insertOp.id, insertOp.value);
        break;
      case OpKind.Remove:
        let removeOp = <RemoveOp> op; 
        this.storage.remove(removeOp.id);
        break;
      default:
        throw new Error(`Unknown op kind ${op.kind}`);
    }
  }
   
}