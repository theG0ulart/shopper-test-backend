import { Entity, PrimaryGeneratedColumn, Column, BaseEntity} from 'typeorm';

@Entity()
export class Measure extends BaseEntity{
    
    @PrimaryGeneratedColumn('uuid')
    uuid!: string;

    @Column()
    customer_code!: string;

    @Column('datetime')
    measure_datetime!: Date;

    @Column()
    measure_type!: 'WATER' | 'GAS';

    @Column()
    measure_value!: number;

    @Column()
    image_url!: string;

    @Column({default: false})
    has_confirmed!: boolean

}