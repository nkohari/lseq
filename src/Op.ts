import {Ident} from './idents';

/**
 * The kind of operation.
 */
export enum OpKind {
  
  /**
   * The insertion of a value.
   */
  Insert = 1,
  
  /**
   * The removal of a value.
   */
  Remove = 2,
}

/**
 * An operation that can be applied to a KSeq.
 */
export abstract class Op {
  
  /**
   * The kind of operation.
   */
  kind: OpKind
  
  /**
   * The id of the replica on which the operation was performed.
   */
  replica: string
  
  /**
   * The local logical time when the operation was performed.
   */
  time: number
  
  /**
   * Creates an instance of Op.
   * @param kind    The kind of operation.
   * @param replica The id of the replica on which the operation was performed.
   * @param time    The local logical time when the operation was performed.
   * @returns An instance of Op.
   */
  constructor(kind: OpKind, replica: string, time: number) {
    this.kind = kind;
    this.replica = replica;
    this.time = time;
  }
  
  /**
   * Converts an encoded string to an Op of the correct type.
   * @param str The encoded string.
   * @returns An instance of the encoded Op.
   */
  static parse(str: string): Op {
    const kind = str[0];
    switch(kind) {
      case '+': return InsertOp.parse(str);
      case '-': return RemoveOp.parse(str);
    }
  }
  
  /**
   * Encodes the Op as a compact string representation.
   */
  abstract toString(): string;
  
}

/**
 * An operation that inserts an atom into the sequence with the specified
 * identifier and value.
 */
export class InsertOp extends Op {
  
  /**
   * The identifier for the value.
   */
  id: Ident
  
  /**
   * The value to insert.
   */
  value: any
  
  /**
   * Creates an instance of InsertOp.
   * @param replica The id of the replica on which the operation was performed.
   * @param time    The local logical time when the operation was performed.
   * @param id      The identifier for the value.
   * @param value   The value to insert.
   * @returns An instance of InsertOp.
   */
  constructor(replica: string, time: number, id: Ident, value: any) {
    super(OpKind.Insert, replica, time)
    this.id = id;
    this.value = value;
  }
  
  /**
   * Converts an encoded string to an InsertOp.
   * @param str The encoded string.
   * @returns An instance of the encoded InsertOp.
   */
  static parse(str: string): InsertOp {
    let [replica, time, id, value] = str.substr(1).split(':');
    return new InsertOp(replica, Number(time), Ident.parse(str), value);
  }
  
  /**
   * @inheritdoc
   */
  toString() {
    return `+${this.replica}:${this.time}:${this.id.toString()}:${this.value.toString()}`
  }
  
}

/**
 * An operation that removes an atom with the specified identifer.
 */
export class RemoveOp extends Op {
  
  /**
   * The identifier to remove.
   */
  id: Ident
  
  /**
   * Creates an instance of RemoveOp.
   * @param replica The id of the replica on which the operation was performed.
   * @param time    The local logical time when the operation was performed.
   * @param id      The identifier of the atom to remove.
   * @returns An instance of RemoveOp.
   */
  constructor(replica: string, time: number, id: Ident) {
    super(OpKind.Remove, replica, time)
    this.id = id;
  }
  
  /**
   * Converts an encoded string to an RemoveOp.
   * @param str The encoded string.
   * @returns An instance of the encoded RemoveOp.
   */
  static parse(str: string): RemoveOp {
    let [replica, time, id] = str.substr(1).split(':');
    return new RemoveOp(replica, Number(time), Ident.parse(str));
  }
  
  /**
   * @inheritdoc
   */
  toString() {
    return `-${this.replica}:${this.time}:${this.id.toString()}`
  }
  
}